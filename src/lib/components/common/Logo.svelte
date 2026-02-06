<script lang="ts">
  let {
    animate = false,
    size = 'md',
    variant = 'icon'
  }: {
    animate?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'full';
  } = $props();

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const fullSizeClasses = {
    sm: 'h-5',
    md: 'h-6',
    lg: 'h-8'
  };
</script>

{#if variant === 'full'}
  <img src="/docs/images/roots-logo.svg" alt="roots" class="{fullSizeClasses[size]} w-auto" />
{:else}
  <img
    src="/docs/images/roots-logo-sm.svg"
    alt="roots"
    class="{iconSizeClasses[size]} {animate ? 'logo-spin' : ''}"
  />
{/if}

<style>
  .logo-spin {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
