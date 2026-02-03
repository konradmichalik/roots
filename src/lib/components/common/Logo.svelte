<script lang="ts">
  let { animate = false, size = 'md' }: {
    animate?: boolean;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
</script>

<img
  src="/roots-logo-sm.svg"
  alt="Roots"
  class="{sizeClasses[size]} {animate ? 'logo-spin' : ''}"
/>

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
