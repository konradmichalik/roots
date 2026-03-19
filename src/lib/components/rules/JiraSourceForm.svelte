<script lang="ts">
  import Info from '@lucide/svelte/icons/info';

  let {
    projectKey = $bindable(''),
    issuePattern = $bindable('')
  }: {
    projectKey: string;
    issuePattern: string;
  } = $props();
</script>

<div class="space-y-3 pl-3 border-l-2 border-brand/30">
  <p class="text-xs text-muted-foreground flex items-center gap-1">
    <Info class="size-3 flex-shrink-0" />
    All worklogs from this Jira project will be matched.
  </p>
  <div>
    <label for="jira-project" class="block text-sm font-medium text-foreground mb-1"
      >Project Key</label
    >
    <input
      id="jira-project"
      type="text"
      bind:value={projectKey}
      placeholder="e.g. SUP"
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono
        focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
  </div>
  <div>
    <label for="jira-pattern" class="block text-sm font-medium text-foreground mb-1"
      >Issue Pattern <span class="text-muted-foreground font-normal">(optional)</span></label
    >
    <input
      id="jira-pattern"
      type="text"
      bind:value={issuePattern}
      placeholder="e.g. SUP-42 or SUP-*"
      class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-mono
        focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
    />
    <p class="text-[10px] text-muted-foreground mt-0.5">
      Leave empty to match all issues. Use * for wildcard (e.g. SUP-*).
    </p>
  </div>
</div>
