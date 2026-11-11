$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000/api'
$script:fail = 0
function Check($name, $cond, $detail = '') {
  if ($cond) { Write-Host "PASS  $name" }
  else { Write-Host "FAIL  $name  $detail"; $script:fail++ }
}
function Req($method, $path, $body, $token) {
  $h = @{ 'Content-Type' = 'application/json' }
  if ($token) { $h['Authorization'] = "Bearer $token" }
  $p = @{ Uri = "$base$path"; Method = $method; Headers = $h; UseBasicParsing = $true }
  if ($body) { $p.Body = ($body | ConvertTo-Json -Depth 12) }
  try {
    $r = Invoke-WebRequest @p
    return @{ status = $r.StatusCode; data = ($r.Content | ConvertFrom-Json) }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $txt = $sr.ReadToEnd()
      $obj = $null
      try { $obj = $txt | ConvertFrom-Json } catch {}
      return @{ status = [int]$resp.StatusCode; data = $obj; raw = $txt }
    }
    return @{ status = 0; error = $_.Exception.Message }
  }
}

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$email = "smoke$stamp@skyvoyage.test"

# 1. register
$r = Req POST '/auth/register' @{ email = $email; password = 'Smoke1234!'; firstName = 'Smoke'; lastName = 'Tester' }
Check 'register' ($r.status -eq 201 -or $r.status -eq 200) "status=$($r.status) $($r.raw)"
$token = $r.data.token
Check 'register token' ([bool]$token)

# 2. login
$r = Req POST '/auth/login' @{ email = $email; password = 'Smoke1234!' }
Check 'login' ($r.status -eq 200) "status=$($r.status)"
$token = $r.data.token

# 3. profile
$r = Req GET '/auth/me' $null $token
Check 'me' ($r.status -eq 200 -and $r.data.user.email -eq $email) "status=$($r.status)"

# 4. airports autocomplete
$r = Req GET '/airports?q=london' $null $token
Check 'airports autocomplete' ($r.status -eq 200 -and $r.data.airports.Count -gt 0) "status=$($r.status)"

# 5. flight search
$date = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
$searchBody = @{
  tripType   = 'oneway'
  legs       = @(@{ from = 'LHR'; to = 'JFK'; date = $date })
  passengers = @{ adult = 1; child = 0; infant = 0 }
  cabin      = 'economy'
}
$r = Req POST '/flights/search' $searchBody $token
Check 'flight search' ($r.status -eq 200 -and $r.data.offers.Count -gt 0) "status=$($r.status) offers=$($r.data.offers.Count)"
$searchId = $r.data.searchId
$offer = $r.data.offers[0]
Check 'search estimated flag' ($r.data.estimated -eq $true) "estimated=$($r.data.estimated)"

# 6. offer detail
$r = Req GET "/flights/search/$searchId/offers/$($offer.id)" $null $token
Check 'offer detail' ($r.status -eq 200 -and $r.data.offer.id -eq $offer.id) "status=$($r.status)"

# 7. seat map
$segId = $offer.legs[0].segments[0].id
$r = Req GET "/flights/search/$searchId/offers/$($offer.id)/segments/$segId/seats?passengers=1" $null $token
Check 'seat map' ($r.status -eq 200 -and $r.data.sections.Count -gt 0 -and $r.data.seats.Count -gt 0) "status=$($r.status) sections=$($r.data.sections.Count) seats=$($r.data.seats.Count)"
$seat = $r.data.seats | Where-Object { $_.state -eq 'available' } | Select-Object -First 1
Check 'available seat found' ([bool]$seat) "seat=$($seat.id)"

# 8. price calendar
$r = Req POST '/flights/calendar' @{ from = 'LHR'; to = 'JFK'; month = (Get-Date).AddDays(30).ToString('yyyy-MM'); cabin = 'economy' } $token
Check 'price calendar' ($r.status -eq 200 -and $r.data.days.Count -gt 0) "status=$($r.status)"

# 9. quote
$quoteBody = @{
  searchId  = $searchId
  offerId   = $offer.id
  seats     = @(@{ segmentId = $segId; passengerIndex = 0; seatId = $seat.id })
  addons    = @{ extraBaggageKg = 0; seatSelection = $true; meal = 'none'; specialAssistance = 'none'; priorityBoarding = $false; travelInsurance = $false }
  passengers = @(@{ type = 'adult'; firstName = 'Smoke'; lastName = 'Tester'; email = $email; phone = '+15551234567' })
}
$r = Req POST '/bookings/quote' $quoteBody $token
Check 'quote' (($r.status -eq 200 -or $r.status -eq 201) -and $r.data.quoteId) "status=$($r.status) $($r.raw)"
$quoteId = $r.data.quoteId

# 10. decline card
$r = Req POST "/bookings/$quoteId/confirm-payment" @{ method = 'card'; card = @{ number = '4000000000000002'; name = 'Smoke Tester'; expiry = '12/30'; cvc = '123' } } $token
Check 'declined card rejected' ($r.status -ge 400) "status=$($r.status)"

# 11. re-quote (hold still valid for same user) then pay success
$r = Req POST '/bookings/quote' $quoteBody $token
Check 're-quote after decline' (($r.status -eq 200 -or $r.status -eq 201)) "status=$($r.status) $($r.raw)"
$quoteId = $r.data.quoteId
$r = Req POST "/bookings/$quoteId/confirm-payment" @{ method = 'card'; card = @{ number = '4242424242424242'; name = 'Smoke Tester'; expiry = '12/30'; cvc = '123' } } $token
Check 'successful payment' ($r.status -eq 200 -and $r.data.booking.reference) "status=$($r.status) $($r.raw)"
$ref = $r.data.booking.reference
Check 'server verification' ($r.data.verification.verified -eq $true) "verifiedBy=$($r.data.verification.verifiedBy)"
Check 'payment captured' ($r.data.booking.payment.status -eq 'captured') "status=$($r.data.booking.payment.status)"

# 12. booking get + list
$r = Req GET "/bookings/$ref" $null $token
Check 'get booking' ($r.status -eq 200 -and $r.data.booking.reference -eq $ref) "status=$($r.status)"
$r = Req GET '/bookings' $null $token
Check 'list bookings' ($r.status -eq 200 -and ($r.data.bookings | Where-Object { $_.reference -eq $ref })) "status=$($r.status)"

# 13. boarding passes
$r = Req GET "/bookings/$ref/boarding-passes" $null $token
Check 'boarding passes' ($r.status -eq 200 -and $r.data.passes.Count -gt 0 -and $r.data.passes[0].qrPayload) "status=$($r.status) passes=$($r.data.passes.Count)"

# 14. calendar events + email ticket
$r = Req GET "/bookings/$ref/calendar-events" $null $token
Check 'calendar events' ($r.status -eq 200 -and $r.data.events.Count -ge 3) "status=$($r.status) events=$($r.data.events.Count)"
$r = Req POST "/bookings/$ref/email-ticket" $null $token
Check 'email ticket queued' ($r.status -eq 200 -and $r.data.ok) "status=$($r.status) $($r.raw)"

# 15. notifications
$r = Req GET '/notifications' $null $token
Check 'notifications' ($r.status -eq 200 -and $r.data.notifications.Count -gt 0) "status=$($r.status) count=$($r.data.notifications.Count)"

# 16. airport guide + facilities + advice
$r = Req GET '/airport/guide?airport=JFK' $null $token
Check 'airport guide' ($r.status -eq 200 -and $r.data.stages.Count -gt 0) "status=$($r.status) stages=$($r.data.stages.Count)"
$r = Req GET '/airport/facilities?airport=JFK' $null $token
Check 'airport facilities' ($r.status -eq 200) "status=$($r.status)"
$boardingAt = (Get-Date).AddHours(3).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$r = Req POST '/ai/waiting-advice' @{ airport = 'JFK'; terminal = '4'; boardingAt = $boardingAt; gate = 'B22'; bookingReference = $ref } $token
Check 'waiting advice' ($r.status -eq 200 -and $r.data.recommendations.Count -gt 0) "status=$($r.status) recs=$($r.data.recommendations.Count)"

# 17. tracking
$r = Req GET "/tracking/booking?reference=$ref" $null $token
Check 'tracking by booking' ($r.status -eq 200) "status=$($r.status) $($r.raw)"

# 18. saved flights
$r = Req POST '/saved-flights' @{ searchId = $searchId; offerId = $offer.id } $token
Check 'save flight' ($r.status -eq 201 -or $r.status -eq 200) "status=$($r.status) $($r.raw)"
$r = Req GET '/saved-flights' $null $token
Check 'list saved flights' ($r.status -eq 200 -and $r.data.flights.Count -gt 0) "status=$($r.status) $($r.raw)"

# 19. cancel booking
$r = Req POST "/bookings/$ref/cancel" $null $token
Check 'cancel booking' ($r.status -eq 200 -and $r.data.booking.status -eq 'cancelled') "status=$($r.status)"

# 20. dev outbox
$r = Req GET '/dev/outbox' $null $token
Check 'dev outbox' ($r.status -eq 200) "status=$($r.status)"

# 21. forgot password
$r = Req POST '/auth/forgot-password' @{ email = $email }
Check 'forgot password' ($r.status -eq 200) "status=$($r.status)"

# 22. protected route without token
$r = Req GET '/bookings' $null $null
Check 'unauthorized blocked' ($r.status -eq 401) "status=$($r.status)"

Write-Host ''
if ($script:fail -eq 0) { Write-Host 'ALL CHECKS PASSED' } else { Write-Host "$script:fail CHECK(S) FAILED"; exit 1 }
