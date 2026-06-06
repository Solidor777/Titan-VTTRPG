# Runs the Playwright e2e suite throttled so a full run does not starve the machine's foreground
# responsiveness (perceived as network/browser freezes during world boots). The wrapper lowers ITS OWN
# process priority to BelowNormal and restricts its core affinity to the first half of the logical
# cores BEFORE spawning anything; on Windows, child processes always inherit the parent's affinity
# mask, and a BelowNormal/Idle priority class is likewise inherited at spawn — so npx, node, the
# Foundry server (when Playwright launches it), and every Chromium process run under both limits.
# Extra arguments pass through to `playwright test` (e.g. `npm run test:e2e -- effect-chat-card`).
# For an unthrottled run, use `npm run test:e2e:fast`.

# This file is Windows PowerShell 5.1 compatible (npm scripts invoke `powershell`).

# The number of logical cores on this machine.
$coreCount = [Environment]::ProcessorCount

# The affinity mask covering the first half of the logical cores (minimum one core).
$maskBits = [Math]::Max(1, [Math]::Floor($coreCount / 2))
$mask = [IntPtr][Int64]([Math]::Pow(2, $maskBits) - 1)

# The wrapper's own process, throttled before any child is spawned so inheritance is race-free.
$self = Get-Process -Id $PID
$self.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal
$self.ProcessorAffinity = $mask

Write-Host "e2e throttled: BelowNormal priority, $maskBits of $coreCount cores (mask $mask)."

# Run the suite; the npm-supplied arguments pass through to `playwright test`.
npx playwright test @args
exit $LASTEXITCODE
