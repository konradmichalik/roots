<script lang="ts">
	import MocoEntryModal from '../moco/MocoEntryModal.svelte';
	import FavoriteModal from '../favorites/FavoriteModal.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import {
		getRegularFavorites,
		getEventFavorites,
		findMatchingFavorite,
		reorderFavorites
	} from '../../stores/favorites.svelte';
	import { dateNavState } from '../../stores/dateNavigation.svelte';
	import { getEntriesForDate, createMocoActivity } from '../../stores/timeEntries.svelte';
	import { connectionsState } from '../../stores/connections.svelte';
	import { formatHours } from '../../utils/time-format';
	import { toast } from '../../stores/toast.svelte';
	import type { Favorite } from '../../types';

	let regularFavorites = $derived(getRegularFavorites());
	let eventFavorites = $derived(getEventFavorites());
	let outlookEntries = $derived(getEntriesForDate(dateNavState.selectedDate).outlook);
	let isAdding = $state(false);

	// Track which event favorites have matches today
	let matchedFavoriteIds = $derived.by(() => {
		const ids = new Set<string>();
		for (const event of outlookEntries) {
			const fav = findMatchingFavorite(event.title);
			if (fav) ids.add(fav.id);
		}
		return ids;
	});

	function isMatched(id: string): boolean {
		return matchedFavoriteIds.has(id);
	}

	// Find matching events that have favorites with eventMatch
	let matchingEvents = $derived.by(() => {
		const matches: Array<{ eventTitle: string; favorite: Favorite; hours: number }> = [];
		for (const event of outlookEntries) {
			const favorite = findMatchingFavorite(event.title);
			if (favorite) {
				matches.push({
					eventTitle: event.title,
					favorite,
					hours: event.hours
				});
			}
		}
		return matches;
	});

	let hasMatchingEvents = $derived(matchingEvents.length > 0);
	let canAddFromEvents = $derived(
		connectionsState.moco.isConnected &&
			connectionsState.outlook.isConnected &&
			hasMatchingEvents &&
			!isAdding
	);

	async function addAllFromEvents(): Promise<void> {
		const matches = matchingEvents;
		if (matches.length === 0) return;

		isAdding = true;
		let successCount = 0;

		try {
			for (const match of matches) {
				const hours = match.hours || match.favorite.defaultHours || 0.25;
				const success = await createMocoActivity({
					date: dateNavState.selectedDate,
					project_id: match.favorite.projectId,
					task_id: match.favorite.taskId,
					hours,
					description: match.favorite.description || match.eventTitle
				});
				if (success) successCount++;
			}

			if (successCount > 0) {
				toast.success(`Created ${successCount} entries from events`);
			}
		} finally {
			isAdding = false;
		}
	}

	// Drag and Drop state
	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);
	let dragGroup = $state<'regular' | 'event' | null>(null);

	function handleDragStart(e: DragEvent, id: string, group: 'regular' | 'event'): void {
		draggedId = id;
		dragGroup = group;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', id);
		}
	}

	function handleDragOver(e: DragEvent, id: string, group: 'regular' | 'event'): void {
		e.preventDefault();
		if (dragGroup === group && draggedId !== id) {
			dragOverId = id;
		}
	}

	function handleDragLeave(): void {
		dragOverId = null;
	}

	function handleDrop(e: DragEvent, targetId: string, group: 'regular' | 'event'): void {
		e.preventDefault();
		if (!draggedId || dragGroup !== group || draggedId === targetId) {
			resetDragState();
			return;
		}

		const list = group === 'regular' ? regularFavorites : eventFavorites;
		const currentIds = list.map((f) => f.id);

		const draggedIndex = currentIds.indexOf(draggedId);
		const targetIndex = currentIds.indexOf(targetId);

		if (draggedIndex === -1 || targetIndex === -1) {
			resetDragState();
			return;
		}

		// Remove dragged item and insert at new position
		const newIds = [...currentIds];
		newIds.splice(draggedIndex, 1);
		newIds.splice(targetIndex, 0, draggedId);

		// Combine with the other group's IDs to maintain full ordering
		const otherList = group === 'regular' ? eventFavorites : regularFavorites;
		const otherIds = otherList.map((f) => f.id);
		const allIds = group === 'regular' ? [...newIds, ...otherIds] : [...otherIds, ...newIds];

		reorderFavorites(allIds);
		resetDragState();
	}

	function handleDragEnd(): void {
		resetDragState();
	}

	function resetDragState(): void {
		draggedId = null;
		dragOverId = null;
		dragGroup = null;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4 text-warning"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polygon
					points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
				/>
			</svg>
			<h3 class="text-sm font-semibold text-foreground">Favorites</h3>
		</div>
		<FavoriteModal mode="create">
			<button
				class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
				title="Add favorite"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
				</svg>
			</button>
		</FavoriteModal>
	</div>

	{#if regularFavorites.length === 0 && eventFavorites.length === 0}
		<p class="text-xs text-muted-foreground">No favorites yet. Click + to add one.</p>
	{/if}

	<!-- Quick Favorites Section -->
	{#if regularFavorites.length > 0}
		<div class="space-y-1.5">
			<div class="flex items-center gap-1.5 px-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3 w-3 text-muted-foreground"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line
						x1="16"
						x2="16"
						y1="2"
						y2="6"
					/><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
				</svg>
				<span class="text-xs font-medium text-muted-foreground">Quick</span>
			</div>

			{#each regularFavorites as favorite (favorite.id)}
				<div
					class="group/fav relative rounded-lg border bg-card transition-all duration-150
						{draggedId === favorite.id
						? 'opacity-50 border-dashed border-primary'
						: dragOverId === favorite.id
							? 'border-primary bg-primary/5'
							: 'border-border hover:border-border-bold'}"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, favorite.id, 'regular')}
					ondragover={(e) => handleDragOver(e, favorite.id, 'regular')}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, favorite.id, 'regular')}
					ondragend={handleDragEnd}
					role="listitem"
				>
					<!-- Drag Handle -->
					<div
						class="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/fav:opacity-100 transition-opacity"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-3 w-3 text-muted-foreground"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle
								cx="9"
								cy="19"
								r="1"
							/><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle
								cx="15"
								cy="19"
								r="1"
							/>
						</svg>
					</div>

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
						<button class="w-full text-left p-2.5 pl-5 cursor-pointer">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-1.5">
										<span class="text-sm font-medium text-foreground truncate"
											>{favorite.name}</span
										>
										{#if favorite.defaultHours}
											<span
												class="text-xs font-mono text-muted-foreground ml-auto flex-shrink-0 pr-5"
											>
												{formatHours(favorite.defaultHours)}
											</span>
										{/if}
									</div>
									{#if favorite.description}
										<p class="text-xs text-foreground/80 truncate">
											{favorite.description}
										</p>
									{/if}
									<p class="text-xs text-muted-foreground truncate">
										{favorite.customerName} — {favorite.projectName}
									</p>
								</div>
							</div>
						</button>
					</MocoEntryModal>

					<div
						class="absolute top-1.5 right-1.5 opacity-0 group-hover/fav:opacity-100 flex items-center gap-0.5 transition-opacity duration-150"
					>
						<FavoriteModal mode="edit" editFavorite={favorite}>
							<button
								type="button"
								class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
								title="Edit favorite"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3 w-3"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
								</svg>
							</button>
						</FavoriteModal>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Event Matching Section -->
	{#if eventFavorites.length > 0}
		<div class="space-y-1.5">
			<div class="flex items-center justify-between px-1">
				<div class="flex items-center gap-1.5">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3 w-3 text-warning"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon
							points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
						/>
					</svg>
					<span class="text-xs font-medium text-muted-foreground">Event Matching</span>
				</div>
				{#if hasMatchingEvents}
					<Tooltip.Provider delayDuration={200}>
						<Tooltip.Root>
							<Tooltip.Trigger>
								<button
									onclick={addAllFromEvents}
									disabled={!canAddFromEvents}
									class="rounded p-0.5 text-source-outlook hover:text-source-outlook hover:bg-source-outlook/10
										disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
								>
									{#if isAdding}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3.5 w-3.5 animate-spin"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
											<path d="M3 3v5h5" />
										</svg>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3.5 w-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line
												x1="16"
												x2="16"
												y1="2"
												y2="6"
											/><line x1="8" x2="8" y1="2" y2="6" /><line
												x1="3"
												x2="21"
												y1="10"
												y2="10"
											/><path d="m9 16 2 2 4-4" />
										</svg>
									{/if}
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content side="bottom" sideOffset={4}>
								Add {matchingEvents.length} matching event{matchingEvents.length !== 1 ? 's' : ''} to
								Moco
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{/if}
			</div>

			{#each eventFavorites as favorite (favorite.id)}
				{@const matched = isMatched(favorite.id)}
				<div
					class="group/fav relative rounded-lg border bg-card transition-all duration-150
						{draggedId === favorite.id
						? 'opacity-50 border-dashed border-primary'
						: dragOverId === favorite.id
							? 'border-primary bg-primary/5'
							: matched
								? 'border-border hover:border-border-bold'
								: 'border-border/50 opacity-50'}"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, favorite.id, 'event')}
					ondragover={(e) => handleDragOver(e, favorite.id, 'event')}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, favorite.id, 'event')}
					ondragend={handleDragEnd}
					role="listitem"
				>
					<!-- Drag Handle -->
					<div
						class="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/fav:opacity-100 transition-opacity"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-3 w-3 text-muted-foreground"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle
								cx="9"
								cy="19"
								r="1"
							/><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle
								cx="15"
								cy="19"
								r="1"
							/>
						</svg>
					</div>

					{#if matched}
						<!-- Matched: Open MocoEntryModal -->
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
							<button class="w-full text-left p-2.5 pl-5 cursor-pointer">
								<div class="flex items-start justify-between gap-2">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-1.5">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-3 w-3 text-success flex-shrink-0"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path
													d="m9 11 3 3L22 4"
												/>
											</svg>
											<span class="text-sm font-medium text-foreground truncate"
												>{favorite.name}</span
											>
											{#if favorite.defaultHours}
												<span
													class="text-xs font-mono text-muted-foreground ml-auto flex-shrink-0 pr-5"
												>
													{formatHours(favorite.defaultHours)}
												</span>
											{/if}
										</div>
										{#if favorite.description}
											<p class="text-xs text-foreground/80 truncate pl-[18px]">
												{favorite.description}
											</p>
										{/if}
										<p class="text-xs text-muted-foreground truncate pl-[18px]">
											{favorite.customerName} — {favorite.projectName}
										</p>
										{#if favorite.eventMatch}
											<p class="text-xs text-warning/70 truncate pl-[18px]">
												{favorite.eventMatch.matchType === 'exact'
													? '='
													: favorite.eventMatch.matchType === 'startsWith'
														? '^'
														: '~'}
												{favorite.eventMatch.pattern}
											</p>
										{/if}
									</div>
								</div>
							</button>
						</MocoEntryModal>
					{:else}
						<!-- Not matched: Open FavoriteModal for editing -->
						<Tooltip.Provider delayDuration={200}>
							<Tooltip.Root>
								<Tooltip.Trigger class="w-full">
									<FavoriteModal mode="edit" editFavorite={favorite}>
										<button class="w-full text-left p-2.5 pl-5 cursor-pointer">
											<div class="flex items-start justify-between gap-2">
												<div class="flex-1 min-w-0">
													<div class="flex items-center gap-1.5">
														<svg
															xmlns="http://www.w3.org/2000/svg"
															class="h-3 w-3 text-muted-foreground flex-shrink-0"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2"
															stroke-linecap="round"
															stroke-linejoin="round"
														>
															<circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path
																d="m9 9 6 6"
															/>
														</svg>
														<span class="text-sm font-medium text-foreground truncate"
															>{favorite.name}</span
														>
														{#if favorite.defaultHours}
															<span
																class="text-xs font-mono text-muted-foreground ml-auto flex-shrink-0 pr-5"
															>
																{formatHours(favorite.defaultHours)}
															</span>
														{/if}
													</div>
													{#if favorite.description}
														<p class="text-xs text-foreground/80 truncate pl-[18px]">
															{favorite.description}
														</p>
													{/if}
													<p class="text-xs text-muted-foreground truncate pl-[18px]">
														{favorite.customerName} — {favorite.projectName}
													</p>
													{#if favorite.eventMatch}
														<p class="text-xs text-muted-foreground/50 truncate pl-[18px]">
															{favorite.eventMatch.matchType === 'exact'
																? '='
																: favorite.eventMatch.matchType === 'startsWith'
																	? '^'
																	: '~'}
															{favorite.eventMatch.pattern}
														</p>
													{/if}
												</div>
											</div>
										</button>
									</FavoriteModal>
								</Tooltip.Trigger>
								<Tooltip.Content side="right" sideOffset={4}>
									No matching event today — click to edit
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/if}

					<div
						class="absolute top-1.5 right-1.5 opacity-0 group-hover/fav:opacity-100 flex items-center gap-0.5 transition-opacity duration-150"
					>
						<FavoriteModal mode="edit" editFavorite={favorite}>
							<button
								type="button"
								class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
								title="Edit favorite"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3 w-3"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
								</svg>
							</button>
						</FavoriteModal>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
