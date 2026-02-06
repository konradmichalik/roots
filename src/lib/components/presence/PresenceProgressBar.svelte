<script lang="ts">
  import { getRawPresencesForDate, getPresenceForDate } from '../../stores/presences.svelte';
  import { today } from '../../utils/date-helpers';
  import { formatHours } from '../../utils/time-format';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import PresenceModal from './PresenceModal.svelte';

  interface Props {
    date: string;
    /** Expected working hours for projection (e.g. 8.0) */
    targetHours?: number;
    /** Already booked hours for this day */
    bookedHours?: number;
  }

  let { date, targetHours = 8, bookedHours = 0 }: Props = $props();

  let rawPresences = $derived(getRawPresencesForDate(date));
  let presence = $derived(getPresenceForDate(date));
  let isToday = $derived(date === today());

  // Current time in minutes for "now" marker (updates every minute)
  let nowMinutes = $state(getCurrentMinutes());
  $effect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      nowMinutes = getCurrentMinutes();
    }, 60000);
    return () => clearInterval(interval);
  });

  function getCurrentMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  function formatBreakMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  // Calculate timeline bounds and segments
  let timeline = $derived.by(() => {
    if (rawPresences.length === 0) return null;

    const startMinutes = timeToMinutes(rawPresences[0].from);
    const lastPresence = rawPresences[rawPresences.length - 1];
    const hasOpenPresence = !lastPresence.to;

    // Calculate total gap time (breaks between presences)
    let totalGapMinutes = 0;
    for (let i = 1; i < rawPresences.length; i++) {
      const prevEnd = rawPresences[i - 1].to;
      const currStart = rawPresences[i].from;
      if (prevEnd) {
        const gap = timeToMinutes(currStart) - timeToMinutes(prevEnd);
        if (gap > 0) totalGapMinutes += gap;
      }
    }

    // End time calculation
    let endMinutes: number;
    let projectedEndMinutes: number | null = null;

    if (lastPresence.to) {
      endMinutes = timeToMinutes(lastPresence.to);
    } else {
      projectedEndMinutes = startMinutes + targetHours * 60 + totalGapMinutes;
      endMinutes = Math.max(projectedEndMinutes, nowMinutes);
    }

    const totalSpan = Math.max(endMinutes - startMinutes, 30);

    type Segment = {
      type: 'booked' | 'open' | 'gap';
      start: number;
      end: number;
    };

    // First pass: collect raw work segments and gaps
    type RawSegment = { type: 'work' | 'gap' | 'future'; start: number; end: number };
    const rawSegments: RawSegment[] = [];

    for (let i = 0; i < rawPresences.length; i++) {
      const p = rawPresences[i];
      const presenceStart = timeToMinutes(p.from);
      const presenceEnd = p.to ? timeToMinutes(p.to) : (isToday ? nowMinutes : presenceStart + 60);

      // Add gap before this presence
      if (i > 0) {
        const prevPresence = rawPresences[i - 1];
        const prevEnd = prevPresence.to ? timeToMinutes(prevPresence.to) : nowMinutes;
        if (presenceStart > prevEnd) {
          rawSegments.push({ type: 'gap', start: prevEnd, end: presenceStart });
        }
      }

      // For today: split work segments at "now"
      if (isToday && p.to && nowMinutes > presenceStart && nowMinutes < presenceEnd) {
        rawSegments.push({ type: 'work', start: presenceStart, end: nowMinutes });
        rawSegments.push({ type: 'future', start: nowMinutes, end: presenceEnd });
      } else if (isToday && p.to && nowMinutes <= presenceStart) {
        rawSegments.push({ type: 'future', start: presenceStart, end: presenceEnd });
      } else {
        rawSegments.push({ type: 'work', start: presenceStart, end: presenceEnd });
      }
    }

    // Add future segment for open presence
    if (hasOpenPresence && isToday && projectedEndMinutes && nowMinutes < projectedEndMinutes) {
      rawSegments.push({ type: 'future', start: nowMinutes, end: projectedEndMinutes });
    }

    // Second pass: split work/future segments into booked/open based on bookedHours
    const segments: Segment[] = [];
    let remainingBookedMinutes = bookedHours * 60;

    for (const raw of rawSegments) {
      if (raw.type === 'gap') {
        // Gaps stay as-is
        segments.push({ type: 'gap', start: raw.start, end: raw.end });
      } else {
        // Work and future segments - split into booked and open
        const duration = raw.end - raw.start;

        if (remainingBookedMinutes >= duration) {
          // Entire segment is booked
          segments.push({ type: 'booked', start: raw.start, end: raw.end });
          remainingBookedMinutes -= duration;
        } else if (remainingBookedMinutes > 0) {
          // Partially booked
          const bookedEnd = raw.start + remainingBookedMinutes;
          segments.push({ type: 'booked', start: raw.start, end: bookedEnd });
          segments.push({ type: 'open', start: bookedEnd, end: raw.end });
          remainingBookedMinutes = 0;
        } else {
          // Not booked at all
          segments.push({ type: 'open', start: raw.start, end: raw.end });
        }
      }
    }

    return { startMinutes, endMinutes, totalSpan, segments, hasOpenPresence, projectedEndMinutes };
  });

  function getSegmentStyle(segment: { start: number; end: number }): string {
    if (!timeline) return '';
    const left = ((segment.start - timeline.startMinutes) / timeline.totalSpan) * 100;
    const width = ((segment.end - segment.start) / timeline.totalSpan) * 100;
    return `left: ${left}%; width: ${width}%;`;
  }

  function getNowMarkerPosition(): string {
    if (!timeline) return '0%';
    const position = ((nowMinutes - timeline.startMinutes) / timeline.totalSpan) * 100;
    return `${Math.min(Math.max(position, 0), 100)}%`;
  }

  let showNowMarker = $derived(
    isToday && timeline && nowMinutes >= timeline.startMinutes && nowMinutes <= timeline.endMinutes
  );

  // Calculate open (unbooked) hours
  let openHours = $derived(Math.max(0, (presence?.hours ?? 0) - bookedHours));
</script>

{#if timeline && timeline.segments.length > 0 && presence}
  <PresenceModal {date}>
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger class="w-full">
          <div class="flex items-center gap-2 cursor-pointer group">
            <!-- Start time -->
            <span class="text-[10px] font-mono text-muted-foreground shrink-0">
              {formatTime(timeline.startMinutes)}
            </span>

            <!-- Progress bar -->
            <div class="relative h-1.5 flex-1 rounded-full bg-muted/30 group-hover:bg-muted/50 transition-colors">
              {#each timeline.segments as segment}
                {#if segment.type === 'booked'}
                  <!-- Booked time: full intensity -->
                  <div
                    class="absolute top-0 h-full rounded-full bg-success transition-all duration-300"
                    style={getSegmentStyle(segment)}
                  ></div>
                {:else if segment.type === 'open'}
                  <!-- Open/unbooked time: warning color -->
                  <div
                    class="absolute top-0 h-full rounded-full bg-danger/50 transition-all duration-300"
                    style={getSegmentStyle(segment)}
                  ></div>
                {:else if segment.type === 'gap'}
                  <!-- Break/gap between presences -->
                  <div
                    class="absolute top-0 h-full rounded-full bg-muted transition-all duration-300"
                    style={getSegmentStyle(segment)}
                  ></div>
                {/if}
              {/each}

              <!-- Now marker -->
              {#if showNowMarker}
                <div
                  class="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-foreground rounded-full shadow-sm ring-2 ring-background"
                  style="left: {getNowMarkerPosition()};"
                ></div>
              {/if}
            </div>

            <!-- End time -->
            <span class="text-[10px] font-mono text-muted-foreground shrink-0 {timeline.projectedEndMinutes ? 'opacity-50' : ''}">
              {formatTime(timeline.endMinutes)}{#if timeline.projectedEndMinutes}?{/if}
            </span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom" class="max-w-xs">
          <div class="space-y-2">
            <div class="text-xs space-y-0.5">
              <div class="flex items-center justify-between gap-4">
                <span class="text-muted-foreground">Presence:</span>
                <span class="font-mono font-medium">{formatHours(presence.hours)}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-muted-foreground">Booked:</span>
                <span class="font-mono font-medium text-success-text">{formatHours(bookedHours)}</span>
              </div>
              {#if openHours > 0.01}
                <div class="flex items-center justify-between gap-4">
                  <span class="text-muted-foreground">Open:</span>
                  <span class="font-mono font-medium text-danger-text">{formatHours(openHours)}</span>
                </div>
              {/if}
              <div class="text-muted-foreground/70 text-[10px] pt-1">Click to edit presence</div>
            </div>
            <div class="space-y-1 pt-1 border-t border-border/50">
              {#each rawPresences as p, i (p.from)}
                <div class="flex items-center gap-2 text-xs">
                  <span class="font-mono">{p.from}–{p.to ?? '...'}</span>
                  {#if p.is_home_office}
                    <span class="text-muted-foreground">(Home)</span>
                  {/if}
                  {#if p.break && p.break > 0}
                    <span class="text-warning-text">-{formatBreakMinutes(p.break)} break</span>
                  {/if}
                </div>
                {#if i < rawPresences.length - 1}
                  {@const nextStart = rawPresences[i + 1].from}
                  {@const currentEnd = p.to}
                  {#if currentEnd && nextStart > currentEnd}
                    <div class="flex items-center gap-2 text-xs text-muted-foreground pl-2">
                      <span class="italic">Gap: {currentEnd}–{nextStart}</span>
                    </div>
                  {/if}
                {/if}
              {/each}
            </div>
          </div>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  </PresenceModal>
{/if}
