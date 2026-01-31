<script lang="ts">
	import FavoriteForm from './FavoriteForm.svelte';
	import MocoEntryModal from '../moco/MocoEntryModal.svelte';
	import { getSortedFavorites, removeFavorite } from '../../stores/favorites.svelte';
	import { dateNavState } from '../../stores/dateNavigation.svelte';
	import { formatHours } from '../../utils/time-format';
	import type { Favorite } from '../../types';

	let showForm = $state(false);
	let editingFavorite = $state<Favorite | undefined>(undefined);

	let favorites = $derived(getSortedFavorites());

	function handleAdd(): void {
		editingFavorite = undefined;
		showForm = true;
	}

	function handleEdit(favorite: Favorite): void {
		editingFavorite = favorite;
		showForm = true;
	}

	function handleDelete(id: string): void {
		removeFavorite(id);
	}

	function handleFormSave(): void {
		showForm = false;
		editingFavorite = undefined;
	}

	function handleFormCancel(): void {
		showForm = false;
		editingFavorite = undefined;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-warning" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
			</svg>
			<h3 class="text-sm font-semibold text-foreground">Favorites</h3>
		</div>
		{#if !showForm}
			<button
				onclick={handleAdd}
				class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
				title="Add favorite"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
				</svg>
			</button>
		{/if}
	</div>

	{#if favorites.length === 0 && !showForm}
		<p class="text-xs text-muted-foreground">No favorites yet. Click + to add one.</p>
	{/if}

	{#each favorites as favorite (favorite.id)}
		{#if editingFavorite?.id === favorite.id && showForm}
			<FavoriteForm
				editFavorite={favorite}
				onSave={handleFormSave}
				onCancel={handleFormCancel}
			/>
		{:else}
			<div class="group/fav relative rounded-lg border border-border bg-card shadow-sm
				hover:shadow-md hover:border-border-bold transition-all duration-150">
				<MocoEntryModal
					mode="create"
					prefill={{
						date: dateNavState.selectedDate,
						hours: favorite.defaultHours ?? 0,
						description: favorite.description ?? '',
						projectId: favorite.projectId,
						taskId: favorite.taskId
					}}
				>
					<button
						class="w-full text-left p-2.5 cursor-pointer"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-1.5">
									{#if favorite.eventMatch}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-warning flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
											<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
										</svg>
									{/if}
									<span class="text-sm font-medium text-foreground truncate">{favorite.name}</span>
								</div>
								<p class="text-xs text-muted-foreground truncate pl-[18px]">
									{favorite.customerName} — {favorite.projectName}
								</p>
								{#if favorite.eventMatch}
									<p class="text-xs text-warning/70 truncate pl-[18px]">
										{favorite.eventMatch.matchType === 'exact' ? '=' : favorite.eventMatch.matchType === 'startsWith' ? '^' : '~'}
										{favorite.eventMatch.pattern}
									</p>
								{/if}
							</div>
							{#if favorite.defaultHours}
								<span class="text-xs font-mono text-muted-foreground flex-shrink-0">
									{formatHours(favorite.defaultHours)}
								</span>
							{/if}
						</div>
					</button>
				</MocoEntryModal>
				<div class="absolute top-1.5 right-1.5 opacity-0 group-hover/fav:opacity-100 flex items-center gap-0.5 transition-opacity duration-150">
					<button
						type="button"
						onclick={() => handleEdit(favorite)}
						class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
						title="Edit favorite"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
						</svg>
					</button>
					<button
						type="button"
						onclick={() => handleDelete(favorite.id)}
						class="rounded p-0.5 text-muted-foreground hover:text-danger-text hover:bg-danger-subtle transition-colors duration-150"
						title="Remove favorite"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
						</svg>
					</button>
				</div>
			</div>
		{/if}
	{/each}

	{#if showForm && !editingFavorite}
		<FavoriteForm onSave={handleFormSave} onCancel={handleFormCancel} />
	{/if}
</div>
