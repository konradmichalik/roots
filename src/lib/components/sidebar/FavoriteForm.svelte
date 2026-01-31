<script lang="ts">
	import ProjectCombobox from '../moco/ProjectCombobox.svelte';
	import TaskCombobox from '../moco/TaskCombobox.svelte';
	import { addFavorite, updateFavorite } from '../../stores/favorites.svelte';
	import { fetchAssignedProjects, fetchTasksForProject, getProjectById, getTasksForProject } from '../../stores/mocoProjects.svelte';
	import { connectionsState } from '../../stores/connections.svelte';
	import type { Favorite, FavoriteEventMatch } from '../../types';

	let { onSave, onCancel, editFavorite }: {
		onSave: () => void;
		onCancel: () => void;
		editFavorite?: Favorite;
	} = $props();

	let name = $state(editFavorite?.name ?? '');
	let projectValue = $state(editFavorite ? String(editFavorite.projectId) : '');
	let taskValue = $state(editFavorite ? String(editFavorite.taskId) : '');
	let selectedProjectId = $state<number | null>(editFavorite?.projectId ?? null);
	let defaultHours = $state(editFavorite?.defaultHours ?? 0);
	let description = $state(editFavorite?.description ?? '');
	let enableEventMatch = $state(!!editFavorite?.eventMatch);
	let matchPattern = $state(editFavorite?.eventMatch?.pattern ?? '');
	let matchType = $state<FavoriteEventMatch['matchType']>(editFavorite?.eventMatch?.matchType ?? 'contains');

	let isMocoConnected = $derived(connectionsState.moco.isConnected);

	$effect(() => {
		if (isMocoConnected) {
			fetchAssignedProjects().then(() => {
				if (selectedProjectId) fetchTasksForProject(selectedProjectId);
			});
		}
	});

	function handleProjectSelect(projectId: number): void {
		const changed = selectedProjectId !== projectId;
		selectedProjectId = projectId;
		if (changed) {
			taskValue = '';
		}
		fetchTasksForProject(projectId);
	}

	function handleSubmit(e: Event): void {
		e.preventDefault();
		if (!name.trim() || !projectValue || !taskValue) return;

		const project = getProjectById(Number(projectValue));
		if (!project) return;

		const tasks = getTasksForProject(Number(projectValue));
		const task = tasks.find((t) => t.id === Number(taskValue));
		if (!task) return;

		const eventMatch: FavoriteEventMatch | undefined =
			enableEventMatch && matchPattern.trim()
				? { pattern: matchPattern.trim(), matchType }
				: undefined;

		if (editFavorite) {
			updateFavorite(editFavorite.id, {
				name: name.trim(),
				projectId: project.id,
				taskId: task.id,
				projectName: project.name,
				taskName: task.name,
				customerName: project.customer.name,
				defaultHours: defaultHours > 0 ? defaultHours : undefined,
				description: description.trim() || undefined,
				eventMatch
			});
		} else {
			addFavorite({
				name: name.trim(),
				projectId: project.id,
				taskId: task.id,
				projectName: project.name,
				taskName: task.name,
				customerName: project.customer.name,
				defaultHours: defaultHours > 0 ? defaultHours : undefined,
				description: description.trim() || undefined,
				eventMatch
			});
		}

		onSave();
	}
</script>

{#if !isMocoConnected}
	<div class="rounded-lg border border-border bg-muted/30 p-3">
		<p class="text-xs text-muted-foreground">Connect Moco to create favorites.</p>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
		<div>
			<label for="fav-name" class="block text-xs font-medium text-foreground mb-1">Name</label>
			<input
				id="fav-name"
				type="text"
				bind:value={name}
				placeholder="e.g. Daily Standup"
				class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground
					focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
			/>
		</div>

		<div>
			<label class="block text-xs font-medium text-foreground mb-1">Project</label>
			<ProjectCombobox bind:value={projectValue} onSelect={handleProjectSelect} />
		</div>

		<div>
			<label class="block text-xs font-medium text-foreground mb-1">Task</label>
			<TaskCombobox projectId={selectedProjectId} bind:value={taskValue} />
		</div>

		<div class="grid grid-cols-2 gap-2">
			<div>
				<label for="fav-hours" class="block text-xs font-medium text-foreground mb-1">Hours (optional)</label>
				<input
					id="fav-hours"
					type="number"
					min="0"
					max="24"
					step="0.25"
					bind:value={defaultHours}
					class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground font-mono
						focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
				/>
			</div>
			<div>
				<label for="fav-desc" class="block text-xs font-medium text-foreground mb-1">Description</label>
				<input
					id="fav-desc"
					type="text"
					bind:value={description}
					placeholder="Optional"
					class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground
						focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
				/>
			</div>
		</div>

		<label class="flex items-center gap-2 cursor-pointer">
			<input type="checkbox" bind:checked={enableEventMatch} class="accent-primary" />
			<span class="text-xs text-foreground">Match Outlook events</span>
		</label>

		{#if enableEventMatch}
			<div class="space-y-2 pl-4 border-l-2 border-warning/30">
				<div>
					<label for="fav-pattern" class="block text-xs font-medium text-foreground mb-1">Pattern</label>
					<input
						id="fav-pattern"
						type="text"
						bind:value={matchPattern}
						placeholder="e.g. Daily"
						class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground
							focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
					/>
				</div>
				<div>
					<label for="fav-match-type" class="block text-xs font-medium text-foreground mb-1">Match type</label>
					<select
						id="fav-match-type"
						bind:value={matchType}
						class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground
							focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring transition-all duration-150"
					>
						<option value="contains">Contains</option>
						<option value="exact">Exact match</option>
						<option value="startsWith">Starts with</option>
					</select>
				</div>
			</div>
		{/if}

		<div class="flex gap-2">
			<button
				type="submit"
				disabled={!name.trim() || !projectValue || !taskValue}
				class="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground
					hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
			>
				{editFavorite ? 'Update' : 'Save'}
			</button>
			<button
				type="button"
				onclick={onCancel}
				class="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground
					hover:bg-secondary active:scale-[0.98] transition-all duration-150"
			>
				Cancel
			</button>
		</div>
	</form>
{/if}
