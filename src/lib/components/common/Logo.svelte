<script lang="ts">
  import { themeState } from '../../stores/theme.svelte';

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

  const logoSrc = $derived(
    themeState.resolvedTheme === 'dark' ? '/images/roots-logo-dark.svg' : '/images/roots-logo.svg'
  );
</script>

{#if variant === 'full'}
  <img src={logoSrc} alt="roots" class="{fullSizeClasses[size]} w-auto" />
{:else}
  <img
    src="/images/roots-logo-sm.svg"
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
