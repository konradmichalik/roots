<script lang="ts">
  let {
    progressPercent,
    overPercent,
    pacePercent
  }: {
    progressPercent: number;
    overPercent: number;
    pacePercent: number;
  } = $props();
</script>

<div class="relative w-full h-1 rounded-full bg-muted/30">
  {#if pacePercent > progressPercent && overPercent === 0}
    <div
      class="absolute top-0 h-full rounded-full bg-danger/40 transition-all duration-300"
      style="left: {progressPercent}%; width: {pacePercent - progressPercent}%;"
    ></div>
  {/if}
  <div
    class="absolute top-0 left-0 h-full rounded-full bg-success transition-all duration-300"
    style="width: {progressPercent}%;"
  ></div>
  {#if overPercent > 0}
    <div
      class="absolute top-0 left-0 h-full rounded-full bg-discovery transition-all duration-300"
      style="width: {overPercent}%;"
    ></div>
  {/if}
  {#if pacePercent > 0 && pacePercent < 100}
    <div
      class="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-foreground/60 rounded-full"
      style="left: {pacePercent}%;"
    ></div>
  {/if}
</div>
