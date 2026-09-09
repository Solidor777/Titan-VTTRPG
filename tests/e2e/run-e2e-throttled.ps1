# Runs the Playwright e2e suite throttled so a full run does not starve the machine's foreground
# responsiveness (perceived as network/browser freezes during world boots). The wrapper lowers ITS OWN
# process priority and restricts its core affinity BEFORE spawning anything; on Windows, child processes
# always inherit the parent's affinity mask, and a priority class is likewise inherited at spawn — so
# npx, node, the Foundry server (when Playwright launches it), and every Chromium process run under both
# limits. Extra arguments pass through to `playwright test` (e.g. `npm run test:e2e -- effect-chat-card`).
# For an unthrottled run, use `npm run test:e2e:fast`.
#
# Configuration (both optional; the defaults reproduce the historical behavior exactly):
#   TITAN_E2E_CORES    - Logical cores the suite may use: a positive integer, or `all` to skip affinity
#                        masking entirely. Defaults to half the machine's logical cores.
#   TITAN_E2E_PRIORITY - Process priority class (Idle, BelowNormal, Normal, AboveNormal, High,
#                        RealTime). Defaults to BelowNormal.
# An out-of-range or unparsable value is a hard error, never a silent fallback to the default.

# This file is Windows PowerShell 5.1 compatible (npm scripts invoke `powershell`).

# The number of logical cores on this machine.
$coreCount = [Environment]::ProcessorCount

# The requested core budget, defaulting to half the logical cores when unset.
$requestedCores = $env:TITAN_E2E_CORES
if ([string]::IsNullOrWhiteSpace($requestedCores)) {
   $requestedCores = [string][Math]::Max(1, [Math]::Floor($coreCount / 2))
}

# The wrapper's own process, throttled before any child is spawned so inheritance is race-free.
$self = Get-Process -Id $PID

# Apply the priority class, rejecting any value that is not a real ProcessPriorityClass member.
$requestedPriority = $env:TITAN_E2E_PRIORITY
if ([string]::IsNullOrWhiteSpace($requestedPriority)) {
   $requestedPriority = 'BelowNormal'
}
try {
   $priority = [System.Diagnostics.ProcessPriorityClass]$requestedPriority
}
catch {
   Write-Error "TITAN_E2E_PRIORITY='$requestedPriority' is not a valid priority class. Valid values: Idle, BelowNormal, Normal, AboveNormal, High, RealTime."
   exit 1
}
$self.PriorityClass = $priority

# Apply the core affinity. `all` leaves the inherited mask untouched so the suite may use every core.
if ($requestedCores -eq 'all') {
   Write-Host "e2e throttled: $priority priority, all $coreCount cores (no affinity mask)."
}
else {
   # The parsed core budget; anything non-numeric or outside 1..coreCount is a hard error.
   $maskBits = 0
   if (-not [int]::TryParse($requestedCores, [ref]$maskBits)) {
      Write-Error "TITAN_E2E_CORES='$requestedCores' is not an integer or 'all'."
      exit 1
   }
   if ($maskBits -lt 1 -or $maskBits -gt $coreCount) {
      Write-Error "TITAN_E2E_CORES=$maskBits is outside the valid range 1..$coreCount on this machine."
      exit 1
   }

   # The affinity mask covering the first $maskBits logical cores.
   $mask = [IntPtr][Int64]([Math]::Pow(2, $maskBits) - 1)
   $self.ProcessorAffinity = $mask

   Write-Host "e2e throttled: $priority priority, $maskBits of $coreCount cores (mask $mask)."
}

# The pass-through arguments for `playwright test`. Windows PowerShell 5.1 silently drops the
# AUTOMATIC $args variable when it is used directly in native-command argument position, so the
# arguments are copied into an ordinary array first (which flattens correctly into separate args).
$passThroughArgs = @($args)

# Run the suite; the npm-supplied arguments pass through to `playwright test`.
npx playwright test $passThroughArgs
exit $LASTEXITCODE
