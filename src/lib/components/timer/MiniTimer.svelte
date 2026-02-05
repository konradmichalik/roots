<script lang="ts">
  import {
    timerState,
    draftsState,
    startTimer,
    pauseTimer,
    resumeTimer,
    getElapsedSeconds,
    formatElapsedTime
  } from '../../stores/timer.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import TimerStartModal from './TimerStartModal.svelte';
  import TimerStopModal from './TimerStopModal.svelte';
  import DraftsDrawer from './DraftsDrawer.svelte';

  // Update display every second when running
  let displayTime = $state('00:00:00');
  let intervalId: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    if (timerState.status === 'running') {
      // Update immediately
      displayTime = formatElapsedTime(getElapsedSeconds());
      // Then update every second
      intervalId = setInterval(() => {
        displayTime = formatElapsedTime(getElapsedSeconds());
      }, 1000);
    } else if (timerState.status === 'paused') {
      // Show paused time
      displayTime = formatElapsedTime(getElapsedSeconds());
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    } else {
      // Idle
      displayTime = '00:00:00';
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  });

  const draftsCount = $derived(draftsState.drafts.length);
  const hasBooking = $derived(timerState.mocoBooking !== null);
  const bookingLabel = $derived(
    timerState.mocoBooking
      ? `${timerState.mocoBooking.customerName} — ${timerState.mocoBooking.projectName}`
      : null
  );
</script>

<div class="flex items-center gap-1">
  {#if timerState.status === 'idle'}
    <!-- Idle: Show play button that opens config modal -->
    <TimerStartModal>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <button
              class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150"
              aria-label="Start Timer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>Start Timer</Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </TimerStartModal>
  {:else}
    <!-- Running or Paused: Show timer display and controls -->
    <div class="flex items-center gap-2 rounded-lg bg-secondary/50 px-2 py-1">
      <!-- Timer display -->
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <span
              class="font-mono text-sm tabular-nums {timerState.status === 'running'
                ? 'text-success-text'
                : 'text-warning-text opacity-70'}"
            >
              {displayTime}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            {#if bookingLabel}
              <div class="text-xs text-muted-foreground">{bookingLabel}</div>
            {:else}
              <div class="text-xs text-muted-foreground">No project selected</div>
            {/if}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      <!-- Pause/Resume button -->
      {#if timerState.status === 'running'}
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                onclick={pauseTimer}
                class="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150"
                aria-label="Pause Timer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Pause</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {:else}
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                onclick={resumeTimer}
                class="rounded p-1 text-warning-text hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150"
                aria-label="Resume Timer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Resume</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {/if}

      <!-- Stop button (opens modal) -->
      <TimerStopModal>
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                class="rounded p-1 text-danger-text hover:bg-danger/10 active:scale-95 transition-all duration-150"
                aria-label="Stop Timer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Stop & Save</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </TimerStopModal>
    </div>
  {/if}

  <!-- Drafts badge -->
  {#if draftsCount > 0}
    <DraftsDrawer>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <button
              class="relative rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all duration-150"
              aria-label="Open Drafts"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
                <path d="M15 3v4a2 2 0 0 0 2 2h4" />
              </svg>
              <span
                class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {draftsCount}
              </span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            {draftsCount} unsaved {draftsCount === 1 ? 'draft' : 'drafts'}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </DraftsDrawer>
  {/if}
</div>
