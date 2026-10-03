import * as THREE from 'three';
import { PlacedObject, CatalogItem } from '../types';
import {
    scene,
    placedObjects,
    setPlacedObjects,
    selectedObject,
    setSelectedObject,
    csState
} from '../state/creatorState';
import { CATALOG_DATABASE } from '../catalog/creatorCatalog';
import {
    createAirplane3DMesh,
    createSpeedboat3DMesh,
    isBoatObject,
    createCustomModel3DMesh,
    createObjectMesh
} from '../models/objectModels';
import {
    selectObject,
    updateInspectorDisplay,
    autoSaveDraft
} from './creatorUI';

// Set of collapsed parent node IDs in the workspace tree
const collapsedNodes = new Set<string>();

// Dragged item ID during HTML5 drag-and-drop
let draggedItemId: string | null = null;

// Search query for filtering workspace objects
let workspaceSearchQuery = '';

/**
 * Returns a Set of all descendant IDs (children, grandchildren, etc.) for a given object ID.
 */
export function getDescendantIds(objId: string): Set<string> {
    const descendants = new Set<string>();
    function collect(currentId: string) {
        for (const p of placedObjects) {
            if (p.parentId === currentId && !descendants.has(p.id)) {
                descendants.add(p.id);
                collect(p.id);
            }
        }
    }
    collect(objId);
    return descendants;
}

/**
 * Reparents a child object under a new parent (or to root Workspace if parentId is null).
 * Uses Three.js attach() to preserve the child's exact world position/rotation/scale!
 */
export function reparentObject(childId: string, parentId: string | null): boolean {
    const child = placedObjects.find(p => p.id === childId);
    if (!child) return false;

    // Cannot parent to self
    if (parentId === childId) return false;

    // Prevent circular parenting
    if (parentId) {
        const descendants = getDescendantIds(childId);
        if (descendants.has(parentId)) {
            console.warn("Cannot parent an object to its own descendant!");
            return false;
        }
        const parent = placedObjects.find(p => p.id === parentId);
        if (!parent || !parent.mesh) return false;

        // Attach child mesh to parent mesh, preserving world transform
        parent.mesh.attach(child.mesh);
        child.parentId = parentId;
    } else {
        // Unparent to root scene, preserving world transform
        scene.attach(child.mesh);
        child.parentId = null;
    }

    // Update child's position record based on current world coords
    const worldPos = new THREE.Vector3();
    child.mesh.getWorldPosition(worldPos);
    child.position = { x: worldPos.x, y: worldPos.y, z: worldPos.z };

    renderWorkspaceTree();
    updateInspectorDisplay();
    autoSaveDraft();
    return true;
}

/**
 * Renames an object and updates both Workspace tree and Inspector displays.
 */
export function renameObject(objId: string, newName: string) {
    const obj = placedObjects.find(p => p.id === objId);
    if (!obj) return;

    const trimmed = newName.trim() || 'Part';
    obj.name = trimmed;

    // Update trigger dialog title if present
    if (obj.trigger) {
        obj.trigger.title = trimmed;
    }

    // Sync Inspector input if this object is currently selected
    const nameInp = document.getElementById('obj-name-input') as HTMLInputElement | null;
    if (nameInp && selectedObject?.id === objId) {
        nameInp.value = trimmed;
    }

    renderWorkspaceTree();
    autoSaveDraft();
}

/**
 * Duplicates an object and all of its children recursively.
 * Preserves relative positioning and parents all cloned children under the cloned parent!
 */
export function duplicateObjectWithChildren(sourceObj: PlacedObject): PlacedObject {
    const idMap = new Map<string, string>(); // oldId -> newId
    const offset = new THREE.Vector3(2, 0, 2);

    // 1. Helper to clone a single placed object
    function cloneSingle(orig: PlacedObject, isRoot: boolean): PlacedObject {
        const newId = 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        idMap.set(orig.id, newId);

        const catItem: CatalogItem = CATALOG_DATABASE.find(c => c.id === orig.catalogId) || {
            id: orig.catalogId || 'block_cube',
            name: orig.name,
            category: (orig.category as any) || 'custom',
            icon: '📦',
            color: orig.color,
            geometryType: (orig.name || '').toLowerCase(),
            baseScale: orig.scale.x || 1
        };

        let newMesh: THREE.Group | THREE.Mesh;
        if (orig.customModelData) {
            newMesh = createCustomModel3DMesh(orig.customModelData, orig.color);
        } else if (orig.isAirplane) {
            newMesh = createAirplane3DMesh(orig.color);
        } else if (orig.isBoat || isBoatObject(orig)) {
            newMesh = createSpeedboat3DMesh(orig.color);
        } else {
            newMesh = createObjectMesh(catItem, orig.color);
        }

        // Apply scale & rotation
        newMesh.scale.set(orig.scale.x, orig.scale.y, orig.scale.z);
        newMesh.rotation.set(orig.rotation.x, orig.rotation.y, orig.rotation.z);

        const newPos = isRoot
            ? { x: orig.position.x + offset.x, y: orig.position.y + offset.y, z: orig.position.z + offset.z }
            : { x: orig.position.x, y: orig.position.y, z: orig.position.z };

        newMesh.position.set(newPos.x, newPos.y, newPos.z);

        const cloned: PlacedObject = {
            id: newId,
            mesh: newMesh,
            catalogId: orig.catalogId,
            name: isRoot ? `${orig.name} (Copy)` : orig.name,
            category: orig.category,
            position: newPos,
            rotation: { x: orig.rotation.x, y: orig.rotation.y, z: orig.rotation.z },
            scale: { x: orig.scale.x, y: orig.scale.y, z: orig.scale.z },
            color: orig.color,
            isPassable: orig.isPassable,
            isAirplane: orig.isAirplane,
            isBoat: orig.isBoat,
            isSpawnPoint: orig.isSpawnPoint,
            gameItemType: orig.gameItemType,
            keyName: orig.keyName,
            requiredKeyName: orig.requiredKeyName,
            enemyData: orig.enemyData ? JSON.parse(JSON.stringify(orig.enemyData)) : undefined,
            trigger: orig.trigger ? JSON.parse(JSON.stringify(orig.trigger)) : undefined,
            script: orig.script ? JSON.parse(JSON.stringify(orig.script)) : undefined,
            movement: orig.movement ? JSON.parse(JSON.stringify(orig.movement)) : undefined,
            customModelData: orig.customModelData ? JSON.parse(JSON.stringify(orig.customModelData)) : undefined,
            isHoldable: orig.isHoldable,
            inHandAtStart: orig.inHandAtStart,
            costsPbx: orig.costsPbx,
            pbxPrice: orig.pbxPrice,
            dealsDamage: orig.dealsDamage,
            damageAmount: orig.damageAmount,
            parentId: null // Will be assigned during linking
        };

        return cloned;
    }

    // 2. Clone root object
    const newRoot = cloneSingle(sourceObj, true);
    scene.add(newRoot.mesh);
    placedObjects.push(newRoot);

    // 3. Find and clone all descendants
    const descendants = getDescendantIds(sourceObj.id);
    const clonedChildren: { orig: PlacedObject; clone: PlacedObject }[] = [];

    for (const descId of descendants) {
        const origChild = placedObjects.find(p => p.id === descId);
        if (origChild) {
            const clonedChild = cloneSingle(origChild, false);
            scene.add(clonedChild.mesh);
            placedObjects.push(clonedChild);
            clonedChildren.push({ orig: origChild, clone: clonedChild });
        }
    }

    // 4. Link hierarchy attachments using Three.js attach()
    for (const { orig, clone } of clonedChildren) {
        const origParentId = orig.parentId;
        if (origParentId) {
            const mappedParentId = idMap.get(origParentId);
            const parentObj = placedObjects.find(p => p.id === mappedParentId);
            if (parentObj && parentObj.mesh) {
                parentObj.mesh.attach(clone.mesh);
                clone.parentId = parentObj.id;
            }
        }
    }

    // 5. Select newly cloned root object and update UI
    selectObject(newRoot);
    renderWorkspaceTree();
    updateInspectorDisplay();
    autoSaveDraft();

    return newRoot;
}

/**
 * Deletes an object and all of its child objects.
 */
export function deleteObjectWithChildren(obj: PlacedObject) {
    const descendants = getDescendantIds(obj.id);
    const toDelete = [obj, ...placedObjects.filter(p => descendants.has(p.id))];

    for (const item of toDelete) {
        if (item.mesh) {
            if (item.mesh.parent) {
                item.mesh.parent.remove(item.mesh);
            } else {
                scene.remove(item.mesh);
            }
            item.mesh.traverse(child => {
                if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).geometry?.dispose();
                    if (Array.isArray((child as THREE.Mesh).material)) {
                        ((child as THREE.Mesh).material as THREE.Material[]).forEach(m => m.dispose());
                    } else {
                        ((child as THREE.Mesh).material as THREE.Material)?.dispose();
                    }
                }
            });
        }
    }

    const deleteIds = new Set(toDelete.map(d => d.id));
    const remaining = placedObjects.filter(p => !deleteIds.has(p.id));
    setPlacedObjects(remaining);
    csState.placedObjects = remaining;

    if (selectedObject && deleteIds.has(selectedObject.id)) {
        selectObject(null);
    }

    renderWorkspaceTree();
    updateInspectorDisplay();
    autoSaveDraft();
}

/**
 * Gets the display icon for an object based on its category / type / name.
 */
function getObjectIcon(obj: PlacedObject): string {
    const cat = (obj.category || '').toLowerCase();
    const name = (obj.name || '').toLowerCase();
    const geom = (obj.catalogId || '').toLowerCase();

    if (name.includes('part') || geom.includes('cube') || geom.includes('block')) return '📦';
    if (obj.isAirplane || name.includes('lennuk') || name.includes('plane')) return '✈️';
    if (obj.isBoat || isBoatObject(obj) || name.includes('paat')) return '🚤';
    if (cat === 'vehicles' || name.includes('auto') || name.includes('car')) return '🚗';
    if (cat === 'nature' || name.includes('puu') || name.includes('kivi') || name.includes('muru')) return '🌳';
    if (cat === 'spawn' || obj.isSpawnPoint) return '🚩';
    if (cat === 'gameplay' || obj.gameItemType === 'coin') return '🪙';
    if (obj.gameItemType === 'door' || name.includes('uks')) return '🚪';
    if (obj.gameItemType === 'key' || name.includes('võti')) return '🔑';
    if (obj.enemyData || name.includes('pahalane') || name.includes('boss')) return '👾';
    if (obj.isHoldable || obj.dealsDamage || name.includes('mõõk') || name.includes('relv')) return '⚔️';
    if (name.includes('maja') || name.includes('haigla') || name.includes('loss') || cat === 'city') return '🏛️';
    return '📦';
}

/**
 * Renders the Workspace tree inside `#workspace-tree-container`.
 */
export function renderWorkspaceTree() {
    const container = document.getElementById('workspace-tree-container');
    if (!container) return;

    // Update count badge
    const countBadge = document.getElementById('workspace-count');
    if (countBadge) {
        countBadge.innerText = placedObjects.length.toString();
    }

    container.innerHTML = '';

    // Root Workspace Node
    const rootEl = document.createElement('div');
    rootEl.id = 'workspace-root-node';
    rootEl.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: rgba(0, 242, 254, 0.08);
        border: 1px dashed rgba(0, 242, 254, 0.4);
        border-radius: 8px;
        margin-bottom: 6px;
        font-size: 0.85rem;
        font-weight: 800;
        color: #00f2fe;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
    `;
    rootEl.innerHTML = `
        <span style="font-size: 1.1rem;">🌐</span>
        <span>Workspace</span>
        <span style="font-size: 0.72rem; color: #94a3b8; font-weight: normal; margin-left: auto;">(${placedObjects.length} objects)</span>
    `;

    // Root drag over & drop to unparent objects back to top-level Workspace
    rootEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        rootEl.style.background = 'rgba(0, 242, 254, 0.25)';
        rootEl.style.borderColor = '#00f2fe';
    });
    rootEl.addEventListener('dragleave', () => {
        rootEl.style.background = 'rgba(0, 242, 254, 0.08)';
        rootEl.style.borderColor = 'rgba(0, 242, 254, 0.4)';
    });
    rootEl.addEventListener('drop', (e) => {
        e.preventDefault();
        rootEl.style.background = 'rgba(0, 242, 254, 0.08)';
        rootEl.style.borderColor = 'rgba(0, 242, 254, 0.4)';
        if (draggedItemId) {
            reparentObject(draggedItemId, null);
            draggedItemId = null;
        }
    });

    container.appendChild(rootEl);

    // Filter by search query if set
    const q = workspaceSearchQuery.trim().toLowerCase();
    const matchingIds = new Set<string>();
    if (q) {
        for (const p of placedObjects) {
            if (p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)) {
                matchingIds.add(p.id);
                // Also include all ancestors so matching children are visible
                let cur = p;
                while (cur.parentId) {
                    matchingIds.add(cur.parentId);
                    const parent = placedObjects.find(x => x.id === cur.parentId);
                    if (!parent) break;
                    cur = parent;
                }
            }
        }
    }

    // Recursive item renderer
    function renderNode(obj: PlacedObject, depth: number) {
        if (q && !matchingIds.has(obj.id)) return;

        const children = placedObjects.filter(p => p.parentId === obj.id);
        const hasChildren = children.length > 0;
        const isCollapsed = collapsedNodes.has(obj.id);
        const isSelected = selectedObject?.id === obj.id;

        const row = document.createElement('div');
        row.className = 'workspace-tree-row' + (isSelected ? ' active' : '');
        row.dataset.objId = obj.id;
        row.draggable = true;

        row.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            padding-left: ${10 + depth * 16}px;
            border-radius: 6px;
            margin-bottom: 2px;
            font-size: 0.8rem;
            color: ${isSelected ? '#00f2fe' : '#e2e8f0'};
            background: ${isSelected ? 'rgba(0, 242, 254, 0.2)' : 'transparent'};
            border: 1px solid ${isSelected ? '#00f2fe' : 'transparent'};
            cursor: pointer;
            user-select: none;
            transition: all 0.15s;
        `;

        // Expand / Collapse Chevron
        const chevron = document.createElement('span');
        chevron.style.cssText = `
            width: 14px;
            text-align: center;
            font-size: 0.72rem;
            color: #94a3b8;
            cursor: pointer;
            visibility: ${hasChildren ? 'visible' : 'hidden'};
        `;
        chevron.innerText = isCollapsed ? '▶' : '▼';
        chevron.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isCollapsed) {
                collapsedNodes.delete(obj.id);
            } else {
                collapsedNodes.add(obj.id);
            }
            renderWorkspaceTree();
        });
        row.appendChild(chevron);

        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.innerText = getObjectIcon(obj);
        iconSpan.style.fontSize = '0.95rem';
        row.appendChild(iconSpan);

        // Name label (supports inline editing on double click)
        const nameSpan = document.createElement('span');
        nameSpan.className = 'workspace-item-name';
        nameSpan.innerText = obj.name || 'Part';
        nameSpan.style.cssText = `
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: ${hasChildren ? '700' : '500'};
        `;

        // Double click to rename
        nameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startInlineRename(nameSpan, obj);
        });
        row.appendChild(nameSpan);

        // Quick Rename Pencil Button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Muuda nime (Rename)';
        editBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 0.75rem;
            cursor: pointer;
            padding: 2px 4px;
            opacity: 0.6;
            transition: opacity 0.2s;
        `;
        editBtn.addEventListener('mouseenter', () => editBtn.style.opacity = '1');
        editBtn.addEventListener('mouseleave', () => editBtn.style.opacity = '0.6');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startInlineRename(nameSpan, obj);
        });
        row.appendChild(editBtn);

        // Quick Duplicate Button
        const dupBtn = document.createElement('button');
        dupBtn.innerHTML = '📋';
        dupBtn.title = 'Kopeeri koos alamatega (Duplicate with children)';
        dupBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 0.75rem;
            cursor: pointer;
            padding: 2px 4px;
            opacity: 0.6;
            transition: opacity 0.2s;
        `;
        dupBtn.addEventListener('mouseenter', () => dupBtn.style.opacity = '1');
        dupBtn.addEventListener('mouseleave', () => dupBtn.style.opacity = '0.6');
        dupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateObjectWithChildren(obj);
        });
        row.appendChild(dupBtn);

        // Quick Delete Button
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '✕';
        delBtn.title = 'Kustuta (Delete)';
        delBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #ff4757;
            font-size: 0.8rem;
            cursor: pointer;
            padding: 2px 4px;
            opacity: 0.6;
            transition: opacity 0.2s;
        `;
        delBtn.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
        delBtn.addEventListener('mouseleave', () => delBtn.style.opacity = '0.6');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteObjectWithChildren(obj);
        });
        row.appendChild(delBtn);

        // Selection on click
        row.addEventListener('click', () => {
            selectObject(obj);
            renderWorkspaceTree();
        });

        // Drag and Drop implementation
        row.addEventListener('dragstart', (e) => {
            draggedItemId = obj.id;
            row.style.opacity = '0.5';
            if (e.dataTransfer) {
                e.dataTransfer.setData('text/plain', obj.id);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        row.addEventListener('dragend', () => {
            draggedItemId = null;
            row.style.opacity = '1';
        });

        row.addEventListener('dragover', (e) => {
            if (draggedItemId && draggedItemId !== obj.id) {
                e.preventDefault();
                row.style.background = 'rgba(0, 242, 254, 0.3)';
                row.style.borderColor = '#00f2fe';
            }
        });

        row.addEventListener('dragleave', () => {
            row.style.background = isSelected ? 'rgba(0, 242, 254, 0.2)' : 'transparent';
            row.style.borderColor = isSelected ? '#00f2fe' : 'transparent';
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.style.background = isSelected ? 'rgba(0, 242, 254, 0.2)' : 'transparent';
            row.style.borderColor = isSelected ? '#00f2fe' : 'transparent';
            if (draggedItemId && draggedItemId !== obj.id) {
                reparentObject(draggedItemId, obj.id);
                draggedItemId = null;
            }
        });

        container.appendChild(row);

        // Render children if expanded
        if (hasChildren && !isCollapsed) {
            for (const child of children) {
                renderNode(child, depth + 1);
            }
        }
    }

    // Render top-level objects (objects with no parentId or whose parent does not exist)
    const topLevelObjects = placedObjects.filter(p => !p.parentId || !placedObjects.some(parent => parent.id === p.parentId));
    for (const obj of topLevelObjects) {
        renderNode(obj, 0);
    }
}

/**
 * Handles inline renaming directly in the tree node label.
 */
function startInlineRename(nameSpan: HTMLElement, obj: PlacedObject) {
    const origName = obj.name || 'Part';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = origName;
    input.style.cssText = `
        flex: 1;
        background: #0f172a;
        border: 1px solid #00f2fe;
        border-radius: 4px;
        color: white;
        font-size: 0.8rem;
        padding: 2px 6px;
        outline: none;
    `;

    const finish = () => {
        const val = input.value.trim() || origName;
        renameObject(obj.id, val);
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') renderWorkspaceTree();
    });
    input.addEventListener('blur', finish);

    nameSpan.replaceWith(input);
    input.focus();
    input.select();
}

/**
 * Attaches event listeners for Workspace search, tab switcher, and Inspector sync.
 */
export function setupWorkspaceEvents() {
    // Search input
    const searchInp = document.getElementById('workspace-search-input') as HTMLInputElement | null;
    if (searchInp) {
        searchInp.addEventListener('input', () => {
            workspaceSearchQuery = searchInp.value;
            renderWorkspaceTree();
        });
    }

    // Tab switcher in #inspector-panel
    const tabWorkspace = document.getElementById('tab-btn-workspace');
    const tabProps = document.getElementById('tab-btn-properties');
    const tabSplit = document.getElementById('tab-btn-split');

    const viewWorkspace = document.getElementById('workspace-panel-view');
    const viewProps = document.getElementById('properties-panel-view');

    function setActiveTab(tab: 'workspace' | 'props' | 'split') {
        if (tabWorkspace) tabWorkspace.classList.toggle('active', tab === 'workspace');
        if (tabProps) tabProps.classList.toggle('active', tab === 'props');
        if (tabSplit) tabSplit.classList.toggle('active', tab === 'split');

        if (viewWorkspace) {
            viewWorkspace.style.display = (tab === 'workspace' || tab === 'split') ? 'flex' : 'none';
        }
        if (viewProps) {
            viewProps.style.display = (tab === 'props' || tab === 'split') ? 'block' : 'none';
        }
    }

    tabWorkspace?.addEventListener('click', () => setActiveTab('workspace'));
    tabProps?.addEventListener('click', () => setActiveTab('props'));
    tabSplit?.addEventListener('click', () => setActiveTab('split'));

    // Inspector Object Name input
    const nameInp = document.getElementById('obj-name-input') as HTMLInputElement | null;
    if (nameInp) {
        nameInp.addEventListener('input', () => {
            if (selectedObject) {
                renameObject(selectedObject.id, nameInp.value);
            }
        });
    }

    // Inspector Parent selector dropdown
    const parentSelect = document.getElementById('obj-parent-select') as HTMLSelectElement | null;
    if (parentSelect) {
        parentSelect.addEventListener('change', () => {
            if (selectedObject) {
                const newParentId = parentSelect.value === 'none' ? null : parentSelect.value;
                reparentObject(selectedObject.id, newParentId);
            }
        });
    }

    // Initial render
    renderWorkspaceTree();
}
