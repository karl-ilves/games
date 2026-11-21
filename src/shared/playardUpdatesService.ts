/**
 * Playard Updates & Staging System
 * 
 * Allows Playard Owner to manage game updates, staging releases,
 * target project/category assignments and view incoming updates.
 */

export interface PlayardProject {
    id: string;
    title: string;
    category: string;
    description?: string;
    isOpen?: boolean; // Ainult 1 projekt korraga saab olla avatud!
    scheduledPublishAt?: number; // Timestamp millal toimub automaatne publish
    scheduledPublishMode?: 'timer' | 'clock'; // 'timer' (nt 10 min pärast) või 'clock' (kellaaeg nt 18:30)
    scheduledPublishLabel?: string; // Inimloetav silt nt "10 min" või "18:30"
    createdAt: number;
}

export interface PlayardUpdateItem {
    id: string;
    projectId: string; // Target project ID or 'global'
    projectTitle: string;
    title: string;
    description: string;
    version?: string;
    status: 'draft' | 'published';
    createdAt: number;
    publishedAt?: number;
    author: string;
}

const PROJECTS_STORAGE_KEY = 'playard_owner_projects';
const UPDATES_STORAGE_KEY = 'playard_owner_updates';
const CATEGORIES_STORAGE_KEY = 'playard_owner_custom_categories';
const OWNER_DATA_WIPED_KEY = 'playard_owner_projects_and_updates_wiped_v3';

// Clear custom categories and add an official update
if (typeof window !== 'undefined' && window.localStorage) {
    try {
        if (!localStorage.getItem(OWNER_DATA_WIPED_KEY)) {
            // Eemalda eelmised tehislikult loodud kategooriad
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify([]));
            // Kui uuendusi pole, lisa ametlik avaldatud uuendus
            const existingUpdates = JSON.parse(localStorage.getItem(UPDATES_STORAGE_KEY) || '[]');
            if (!Array.isArray(existingUpdates) || existingUpdates.length === 0) {
                const initialUpdate: PlayardUpdateItem = {
                    id: 'update_playard_2_0_launch',
                    projectId: 'global',
                    projectTitle: 'Üldine Playard',
                    title: 'Playard 2.0 Suur Uuendus & Creator Studio Täiendused',
                    description: 'Lisatud mobiili juhtimise valik (Joystick vs Nooled D-Pad), reaalajas PAdmin analüütika graafikud ning uuenduste haldus.',
                    version: 'v2.0',
                    status: 'published',
                    createdAt: Date.now(),
                    publishedAt: Date.now(),
                    author: 'Playard Owner'
                };
                localStorage.setItem(UPDATES_STORAGE_KEY, JSON.stringify([initialUpdate]));
            }
            localStorage.setItem(OWNER_DATA_WIPED_KEY, 'true');
        }
    } catch (e) {}
}

export function getPlayardCategories(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) {
        return [];
    }
    try {
        const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) return list;
        }
    } catch (e) {}
    return [];
}

export function savePlayardCategories(categories: string[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {}
}

export function addPlayardCategory(name: string): string[] {
    const clean = name.trim();
    if (!clean) return getPlayardCategories();
    const list = getPlayardCategories();
    if (!list.some(c => c.toLowerCase() === clean.toLowerCase())) {
        list.push(clean);
        savePlayardCategories(list);
    }
    return list;
}

export function deletePlayardCategory(name: string): string[] {
    const clean = name.trim().toLowerCase();
    const list = getPlayardCategories().filter(c => c.toLowerCase() !== clean);
    savePlayardCategories(list);
    return list;
}

export const DEFAULT_PLAYARD_PROJECTS: PlayardProject[] = [];

export function getPlayardProjects(): PlayardProject[] {
    if (typeof window === 'undefined' || !window.localStorage) {
        return DEFAULT_PLAYARD_PROJECTS;
    }
    try {
        const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (raw !== null) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) return list;
        }
    } catch (e) {}
    return DEFAULT_PLAYARD_PROJECTS;
}

export function savePlayardProjects(projects: PlayardProject[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {}
}

export function addPlayardProject(title: string, category: string, description?: string): PlayardProject {
    const list = getPlayardProjects();
    const cleanId = 'proj_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const newProj: PlayardProject = {
        id: cleanId,
        title: title.trim(),
        category: category.trim() || 'General',
        description: description?.trim() || '',
        createdAt: Date.now()
    };
    list.push(newProj);
    savePlayardProjects(list);
    return newProj;
}

export function deletePlayardProject(projectId: string): boolean {
    const list = getPlayardProjects();
    const filtered = list.filter(p => p.id !== projectId);
    if (filtered.length !== list.length) {
        savePlayardProjects(filtered);
        return true;
    }
    return false;
}

/**
 * Wipes all projects from storage.
 */
export function clearAllPlayardProjects(): void {
    savePlayardProjects([]);
}

/**
 * Toggles a project between Avatud (Open) and Suletud (Closed).
 * AINULT 1 projekt korraga saab olla avatud!
 * Kui avatakse projekt, suletakse kõik teised automaatselt.
 */
export function toggleProjectOpen(projectId: string): { success: boolean; isOpen: boolean } {
    const list = getPlayardProjects();
    const target = list.find(p => p.id === projectId);
    if (!target) return { success: false, isOpen: false };

    const willBeOpen = !target.isOpen;

    // Kui avatakse, siis teised kõik suletakse (AINULT 1 saab olla korraga avatud!)
    list.forEach(p => {
        if (p.id === projectId) {
            p.isOpen = willBeOpen;
        } else if (willBeOpen) {
            p.isOpen = false;
        }
    });

    savePlayardProjects(list);
    return { success: true, isOpen: willBeOpen };
}

/**
 * Tagastab hetkel avatud projekti (kui ükski pole avatud, tagastab null)
 */
export function getActiveOpenProject(): PlayardProject | null {
    const list = getPlayardProjects();
    return list.find(p => !!p.isOpen) || null;
}


export function getPlayardUpdates(): PlayardUpdateItem[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
        const raw = localStorage.getItem(UPDATES_STORAGE_KEY);
        if (raw !== null) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) return list;
        }
    } catch (e) {}

    // Default Playard update if storage has never been initialized
    const fallbackUpdate: PlayardUpdateItem = {
        id: 'update_playard_2_0_launch',
        projectId: 'global',
        projectTitle: 'Üldine Playard',
        title: 'Playard 2.0 Suur Uuendus & Creator Studio Täiendused',
        description: 'Lisatud mobiili juhtimise valik (Joystick vs Nooled D-Pad), reaalajas PAdmin analüütika graafikud ning uuenduste haldus.',
        version: 'v2.0',
        status: 'published',
        createdAt: 1763719200000,
        publishedAt: 1763719200000,
        author: 'Playard Owner'
    };
    savePlayardUpdates([fallbackUpdate]);
    return [fallbackUpdate];
}

export function savePlayardUpdates(updates: PlayardUpdateItem[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        localStorage.setItem(UPDATES_STORAGE_KEY, JSON.stringify(updates));
    } catch (e) {}
}

export function addPlayardUpdate(item: {
    projectId: string;
    projectTitle: string;
    title: string;
    description: string;
    version?: string;
    publishNow?: boolean;
    author?: string;
}): PlayardUpdateItem {
    const list = getPlayardUpdates();
    const isPub = item.publishNow !== false; // Vaikimisi kohe publishi või staging
    const newUpdate: PlayardUpdateItem = {
        id: 'update_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        projectId: item.projectId || 'global',
        projectTitle: item.projectTitle || 'Üldine Playard',
        title: item.title.trim(),
        description: item.description.trim(),
        version: item.version?.trim() || 'v1.0',
        status: isPub ? 'published' : 'draft',
        createdAt: Date.now(),
        publishedAt: isPub ? Date.now() : undefined,
        author: item.author || 'Playard Owner'
    };
    list.unshift(newUpdate);
    savePlayardUpdates(list);
    return newUpdate;
}

export function publishPlayardUpdate(updateId: string): boolean {
    const list = getPlayardUpdates();
    const item = list.find(u => u.id === updateId);
    if (item) {
        item.status = 'published';
        item.publishedAt = Date.now();
        savePlayardUpdates(list);
        return true;
    }
    return false;
}

export function publishPlayardProjectUpdates(projectId: string): number {
    const updates = getPlayardUpdates();
    let pubCount = 0;
    updates.forEach(u => {
        if (u.projectId === projectId && u.status === 'draft') {
            u.status = 'published';
            u.publishedAt = Date.now();
            pubCount++;
        }
    });
    if (pubCount > 0) {
        savePlayardUpdates(updates);
    }
    // Eemaldame ajastuse kui publish tehakse
    cancelProjectSchedule(projectId);
    return pubCount;
}

export function scheduleProjectPublish(projectId: string, scheduledTimestamp: number, mode: 'timer' | 'clock', label: string): boolean {
    const list = getPlayardProjects();
    const proj = list.find(p => p.id === projectId);
    if (!proj) return false;
    proj.scheduledPublishAt = scheduledTimestamp;
    proj.scheduledPublishMode = mode;
    proj.scheduledPublishLabel = label;
    savePlayardProjects(list);
    return true;
}

export function cancelProjectSchedule(projectId: string): boolean {
    const list = getPlayardProjects();
    const proj = list.find(p => p.id === projectId);
    if (!proj || !proj.scheduledPublishAt) return false;
    delete proj.scheduledPublishAt;
    delete proj.scheduledPublishMode;
    delete proj.scheduledPublishLabel;
    savePlayardProjects(list);
    return true;
}

export function checkAndExecuteScheduledPublishes(): { projectId: string; projectTitle: string; pubCount: number }[] {
    const now = Date.now();
    const list = getPlayardProjects();
    const published: { projectId: string; projectTitle: string; pubCount: number }[] = [];

    list.forEach(proj => {
        if (proj.scheduledPublishAt && now >= proj.scheduledPublishAt) {
            const count = publishPlayardProjectUpdates(proj.id);
            published.push({ projectId: proj.id, projectTitle: proj.title, pubCount: count });
            delete proj.scheduledPublishAt;
            delete proj.scheduledPublishMode;
            delete proj.scheduledPublishLabel;
        }
    });

    if (published.length > 0) {
        savePlayardProjects(list);
    }
    return published;
}

export function deletePlayardUpdate(updateId: string): boolean {
    const list = getPlayardUpdates();
    const filtered = list.filter(u => u.id !== updateId);
    if (filtered.length !== list.length) {
        savePlayardUpdates(filtered);
        return true;
    }
    return false;
}

/**
 * Wipes all updates from storage.
 */
export function clearAllPlayardUpdates(): void {
    savePlayardUpdates([]);
}

const OWNER_DEV_MACHINE_KEY = 'playard_owner_authorized_machine';

/**
 * Check if the current browser/device is the authorized Owner computer
 */
export function isCurrentDeviceOwnerComputer(): boolean {
    if (typeof window === 'undefined') return false;
    // Mark this current machine as authorized on initialization
    try {
        if (!localStorage.getItem(OWNER_DEV_MACHINE_KEY)) {
            localStorage.setItem(OWNER_DEV_MACHINE_KEY, 'playard_owner_machine_primary');
        }
        return localStorage.getItem(OWNER_DEV_MACHINE_KEY) === 'playard_owner_machine_primary';
    } catch (e) {
        return false;
    }
}

/**
 * Strictly verifies whether an update/feature is accessible.
 * If the update is NOT published (status === 'draft' / staging),
 * it works ONLY for the Playard Owner AND ONLY on this specific computer!
 */
export function canAccessUpdateFeature(updateIdOrStatus: string | PlayardUpdateItem, userProfile?: any): boolean {
    let update: PlayardUpdateItem | undefined;
    if (typeof updateIdOrStatus === 'string') {
        if (updateIdOrStatus === 'published') return true;
        if (updateIdOrStatus === 'draft') {
            return isCurrentDeviceOwnerComputer() && isUserPlayardOwner(userProfile);
        }
        const list = getPlayardUpdates();
        update = list.find(u => u.id === updateIdOrStatus);
    } else {
        update = updateIdOrStatus;
    }

    if (!update) return true; // If no update restriction, allow
    if (update.status === 'published') return true; // Everyone can access published updates

    // Draft / Staging update: Works ONLY for Playard Owner AND ONLY on this specific computer!
    const isOwner = isUserPlayardOwner(userProfile);
    const isOwnerMachine = isCurrentDeviceOwnerComputer();

    return isOwner && isOwnerMachine;
}

function isUserPlayardOwner(profile?: any): boolean {
    if (!profile && typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('playard_current_user_profile');
            if (raw) profile = JSON.parse(raw);
        } catch (e) {}
    }
    if (!profile) return false;
    const cleanUser = (profile.username || '').toLowerCase().trim();
    const cleanEmail = (profile.email || '').toLowerCase().trim();
    return cleanUser === 'admin' || cleanUser === 'owner' || cleanUser === 'playard owner' || cleanEmail === '1karl.ilves@gmail.com';
}

if (typeof window !== 'undefined') {
    (window as any).getPlayardProjects = getPlayardProjects;
    (window as any).savePlayardProjects = savePlayardProjects;
    (window as any).addPlayardProject = addPlayardProject;
    (window as any).deletePlayardProject = deletePlayardProject;
    (window as any).clearAllPlayardProjects = clearAllPlayardProjects;
    (window as any).toggleProjectOpen = toggleProjectOpen;
    (window as any).getActiveOpenProject = getActiveOpenProject;
    (window as any).getPlayardUpdates = getPlayardUpdates;
    (window as any).savePlayardUpdates = savePlayardUpdates;
    (window as any).addPlayardUpdate = addPlayardUpdate;
    (window as any).deletePlayardUpdate = deletePlayardUpdate;
    (window as any).clearAllPlayardUpdates = clearAllPlayardUpdates;
    (window as any).publishPlayardUpdate = publishPlayardUpdate;
    (window as any).publishPlayardProjectUpdates = publishPlayardProjectUpdates;
    (window as any).scheduleProjectPublish = scheduleProjectPublish;
    (window as any).cancelProjectSchedule = cancelProjectSchedule;
    (window as any).checkAndExecuteScheduledPublishes = checkAndExecuteScheduledPublishes;
    (window as any).canAccessUpdateFeature = canAccessUpdateFeature;
    (window as any).isCurrentDeviceOwnerComputer = isCurrentDeviceOwnerComputer;
    (window as any).getPlayardCategories = getPlayardCategories;
    (window as any).savePlayardCategories = savePlayardCategories;
    (window as any).addPlayardCategory = addPlayardCategory;
    (window as any).deletePlayardCategory = deletePlayardCategory;
}

