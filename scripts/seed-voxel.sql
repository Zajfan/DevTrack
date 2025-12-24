-- Seed data for Project Voxel (Voxel Game Engine)
-- This populates DevTrack with comprehensive project data

-- First, update the existing Project Voxel with full 5W1H concept data
UPDATE projects SET
  concept_what = 'A modular, general-purpose voxel game engine and editor designed to democratize voxel game development across multiple genres and platforms',
  concept_how = 'Modular architecture with pluggable meshing algorithms (Dual Contouring, Surface Nets, Transvoxel, Sparse Voxel Octrees, Ray Marching, Greedy Meshing), renderer abstraction layer, and unified world management system',
  concept_where = 'Cross-platform desktop and web deployment using modern graphics APIs (Vulkan, Metal, DirectX 12, WebGPU)',
  concept_with_what = 'Godot/Unreal/Rust+Bevy engines, advanced data structures (Octrees, SDFs, compressed chunks), LOD systems, procedural generation tools',
  concept_when = '5-phase roadmap: Phase 1 (3mo Foundation) → Phase 2 (6mo Core Features) → Phase 3 (12mo Advanced) → Phase 4 (2yr Scale) → Phase 5 (2yr+ Ecosystem)',
  concept_why = 'Current voxel engines are fragmented, genre-specific, or closed-source. This engine will provide a unified, open, flexible foundation for all voxel game types with production-ready tools',
  description = 'Multi-scale voxel engine supporting terrain (Minecraft-style), smooth surfaces (Dreams/Claybook), architecture (MagicaVoxel), and hybrid approaches. Includes integrated editor, asset pipeline, and extensibility framework.'
WHERE id = 2;

-- Phase 1: Foundation (3 months) - Core Architecture
INSERT INTO tasks (project_id, title, description, status, priority, start_date, due_date, created_at, updated_at, position, tags) VALUES
(2, 'Set up core project structure', 'Initialize repository with Rust workspace, configure build system, set up CI/CD pipeline with GitHub Actions', 'done', 'high', '2024-01-01', '2024-01-07', datetime('now'), datetime('now'), 1, '["architecture","setup"]'),
(2, 'Implement basic chunk system', 'Create Chunk struct with configurable size (16x16x16 default), implement ChunkManager for spatial indexing, add chunk loading/unloading', 'done', 'high', '2024-01-08', '2024-01-21', datetime('now'), datetime('now'), 2, '["core","data-structures"]'),
(2, 'Design voxel data representation', 'Define Voxel struct (type ID, metadata, lighting), implement VoxelRegistry for type management, create efficient storage with bit-packing', 'done', 'high', '2024-01-15', '2024-01-28', datetime('now'), datetime('now'), 3, '["core","data-structures"]'),
(2, 'Implement naive meshing algorithm', 'Simple greedy meshing as baseline, generate quads for visible faces, optimize face culling between chunks', 'done', 'medium', '2024-01-22', '2024-02-11', datetime('now'), datetime('now'), 4, '["rendering","meshing"]'),
(2, 'Create basic renderer abstraction', 'Define Renderer trait with methods for mesh submission, shader management, state changes. Implement simple OpenGL backend', 'done', 'high', '2024-02-05', '2024-02-25', datetime('now'), datetime('now'), 5, '["rendering","abstraction"]'),
(2, 'Implement camera and controls', 'FPS-style camera with WASD movement, mouse look, configurable speed/sensitivity, basic collision detection', 'done', 'medium', '2024-02-12', '2024-03-03', datetime('now'), datetime('now'), 6, '["input","camera"]'),
(2, 'Add basic world generation', 'Simple procedural terrain using Perlin noise, biome system with height maps, cave generation using 3D noise', 'in_progress', 'medium', '2024-02-19', '2024-03-17', datetime('now'), datetime('now'), 7, '["worldgen","procgen"]'),
(2, 'Write comprehensive architecture docs', 'Document module structure, data flow, rendering pipeline, meshing strategies. Create diagrams for MULTI_SCALE_SUMMARY', 'todo', 'medium', '2024-03-04', '2024-03-24', datetime('now'), datetime('now'), 8, '["documentation"]');

-- Phase 2: Core Features (6 months) - Advanced Meshing & Editor
INSERT INTO tasks (project_id, title, description, status, priority, start_date, due_date, created_at, updated_at, position, tags) VALUES
(2, 'Implement Dual Contouring meshing', 'DC algorithm for smooth surfaces, hermite data storage, feature-preserving mesh generation with QEF solving', 'todo', 'high', '2024-04-01', '2024-05-12', datetime('now'), datetime('now'), 9, '["meshing","dual-contouring"]'),
(2, 'Add Surface Nets meshing', 'Simpler smooth meshing alternative, lower memory footprint than DC, good for organic shapes', 'todo', 'medium', '2024-04-15', '2024-05-26', datetime('now'), datetime('now'), 10, '["meshing","surface-nets"]'),
(2, 'Integrate Transvoxel for LOD transitions', 'Seamless LOD transitions with Transvoxel algorithm, implement crack-free stitching, optimize transition cells', 'todo', 'high', '2024-05-01', '2024-06-30', datetime('now'), datetime('now'), 11, '["lod","meshing","transvoxel"]'),
(2, 'Build Sparse Voxel Octree (SVO)', 'Hierarchical spatial structure for efficient large-scale worlds, implement node compression, ray traversal optimization', 'todo', 'high', '2024-05-13', '2024-07-21', datetime('now'), datetime('now'), 12, '["data-structures","svo","optimization"]'),
(2, 'Create editor foundation', 'ImGui-based editor UI, viewport integration, scene hierarchy, property inspector', 'todo', 'high', '2024-06-01', '2024-07-14', datetime('now'), datetime('now'), 13, '["editor","ui"]'),
(2, 'Implement voxel editing tools', 'Brush system (add/remove/paint voxels), shape primitives (sphere, box, cylinder), undo/redo system', 'todo', 'medium', '2024-06-15', '2024-08-04', datetime('now'), datetime('now'), 14, '["editor","tools"]'),
(2, 'Add material and texture system', 'PBR materials for voxels, texture atlas management, UV mapping for greedy meshing, material blending', 'todo', 'medium', '2024-07-01', '2024-08-25', datetime('now'), datetime('now'), 15, '["rendering","materials"]'),
(2, 'Implement lighting system', 'Sunlight propagation, point lights, ambient occlusion, colored lighting support', 'todo', 'high', '2024-07-15', '2024-09-08', datetime('now'), datetime('now'), 16, '["rendering","lighting"]'),
(2, 'Create asset import/export pipeline', 'MagicaVoxel (.vox) import, Minecraft schematic support, custom binary format for chunks', 'todo', 'medium', '2024-08-01', '2024-09-22', datetime('now'), datetime('now'), 17, '["assets","io"]');

-- Phase 3: Advanced Features (12 months) - Physics & Multiplayer
INSERT INTO tasks (project_id, title, description, status, priority, start_date, due_date, created_at, updated_at, position, tags) VALUES
(2, 'Integrate Rapier physics engine', 'Voxel-to-collider conversion, dynamic voxel destruction with physics response, character controller', 'todo', 'high', '2024-10-01', '2025-01-26', datetime('now'), datetime('now'), 18, '["physics","rapier"]'),
(2, 'Implement greedy meshing optimization', 'Advanced face merging, multi-material support, optimize for cache locality', 'todo', 'medium', '2024-10-15', '2025-02-09', datetime('now'), datetime('now'), 19, '["meshing","optimization"]'),
(2, 'Add ray marching renderer', 'SDF-based rendering for ultra-smooth surfaces, implement distance field generation from voxels, optimize with octree acceleration', 'todo', 'high', '2024-11-01', '2025-03-16', datetime('now'), datetime('now'), 20, '["rendering","ray-marching","sdf"]'),
(2, 'Create networking layer', 'Client-server architecture with Quinn (QUIC), chunk streaming, state synchronization, interest management', 'todo', 'high', '2024-12-01', '2025-05-11', datetime('now'), datetime('now'), 21, '["networking","multiplayer"]'),
(2, 'Implement entity system', 'ECS architecture for game objects, voxel entity interactions, serialization', 'todo', 'medium', '2025-01-01', '2025-05-25', datetime('now'), datetime('now'), 22, '["ecs","entities"]'),
(2, 'Build advanced worldgen tools', 'Biome blending, structure generation (buildings, dungeons), erosion simulation, vegetation placement', 'todo', 'medium', '2025-02-01', '2025-07-06', datetime('now'), datetime('now'), 23, '["worldgen","procgen"]'),
(2, 'Create plugin system', 'Dynamic library loading, plugin API for custom voxel types, meshing algorithms, game logic hooks', 'todo', 'high', '2025-03-01', '2025-08-17', datetime('now'), datetime('now'), 24, '["extensibility","plugins"]'),
(2, 'Optimize multi-threading', 'Parallel chunk meshing with rayon, async world loading, thread-safe spatial queries', 'todo', 'high', '2025-04-01', '2025-09-21', datetime('now'), datetime('now'), 25, '["optimization","multithreading"]');

-- Phase 4: Production Polish (24 months) - AAA Features
INSERT INTO tasks (project_id, title, description, status, priority, start_date, due_date, created_at, updated_at, position, tags) VALUES
(2, 'Implement Vulkan renderer backend', 'Full Vulkan implementation with modern features, async compute for meshing, indirect rendering', 'todo', 'high', '2025-10-01', '2026-06-21', datetime('now'), datetime('now'), 26, '["rendering","vulkan"]'),
(2, 'Add Metal backend for macOS/iOS', 'Native Metal support, Metal Performance Shaders integration, unified shader compilation', 'todo', 'medium', '2025-11-01', '2026-07-19', datetime('now'), datetime('now'), 27, '["rendering","metal","macos"]'),
(2, 'Create DirectX 12 backend', 'DX12 renderer for Windows, PIX integration, DirectStorage for fast asset loading', 'todo', 'medium', '2025-12-01', '2026-08-16', datetime('now'), datetime('now'), 28, '["rendering","dx12","windows"]'),
(2, 'Implement WebGPU for browser', 'WASM compilation, WebGPU renderer, optimized for web constraints', 'todo', 'high', '2026-01-01', '2026-09-13', datetime('now'), datetime('now'), 29, '["rendering","webgpu","wasm","web"]'),
(2, 'Build visual scripting system', 'Node-based scripting for gameplay, voxel manipulation logic, event system integration', 'todo', 'medium', '2026-02-01', '2026-11-08', datetime('now'), datetime('now'), 30, '["scripting","editor","visual"]'),
(2, 'Add audio system', 'Spatial audio with voxel occlusion, material-based sound propagation, music/SFX playback', 'todo', 'low', '2026-03-01', '2027-01-03', datetime('now'), datetime('now'), 31, '["audio"]'),
(2, 'Implement advanced LOD system', 'Geometric error metrics, screen-space LOD selection, smooth LOD transitions with morphing', 'todo', 'high', '2026-04-01', '2027-02-28', datetime('now'), datetime('now'), 32, '["lod","optimization"]'),
(2, 'Create profiling and debug tools', 'In-game profiler, memory analyzer, chunk visualization, meshing statistics', 'todo', 'medium', '2026-05-01', '2027-04-26', datetime('now'), datetime('now'), 33, '["tooling","profiling","debug"]');

-- Phase 5: Ecosystem (24+ months) - Community & Platform
INSERT INTO tasks (project_id, title, description, status, priority, start_date, due_date, created_at, updated_at, position, tags) VALUES
(2, 'Launch official documentation site', 'Comprehensive API docs, tutorials, architecture guides, best practices, sample projects', 'todo', 'high', '2027-01-01', '2027-09-05', datetime('now'), datetime('now'), 34, '["documentation","community"]'),
(2, 'Build asset marketplace', 'Community asset sharing platform, voxel model browser, prefab system, licensing management', 'todo', 'medium', '2027-02-01', '2027-10-31', datetime('now'), datetime('now'), 35, '["platform","marketplace","community"]'),
(2, 'Create game templates', 'Pre-built templates: Minecraft clone, smooth terrain game, voxel destruction game, architecture tool', 'todo', 'medium', '2027-03-01', '2027-12-26', datetime('now'), datetime('now'), 36, '["templates","examples"]'),
(2, 'Implement cloud save system', 'User accounts, cloud world storage, automatic backups, cross-device sync', 'todo', 'low', '2027-04-01', '2028-03-20', datetime('now'), datetime('now'), 37, '["cloud","platform"]'),
(2, 'Add mobile support (iOS/Android)', 'Touch controls, performance optimizations for mobile GPUs, app store deployment', 'todo', 'medium', '2027-05-01', '2028-06-11', datetime('now'), datetime('now'), 38, '["mobile","platform"]'),
(2, 'Build Steam/Epic Games integration', 'Workshop support, achievements, multiplayer matchmaking, cloud saves', 'todo', 'medium', '2027-06-01', '2028-09-03', datetime('now'), datetime('now'), 39, '["platform","steam","epic"]'),
(2, 'Create VR/AR support', 'OpenXR integration, VR editor mode, hand tracking, immersive voxel building', 'todo', 'low', '2027-07-01', '2028-11-26', datetime('now'), datetime('now'), 40, '["vr","ar","xr"]'),
(2, 'Establish community governance', 'RFC process for major features, community voting, open roadmap, contributor program', 'todo', 'medium', '2027-08-01', '2029-02-18', datetime('now'), datetime('now'), 41, '["community","governance"]');

-- Ongoing maintenance tasks
INSERT INTO tasks (project_id, title, description, status, priority, created_at, updated_at, position, tags) VALUES
(2, 'Performance benchmarking suite', 'Automated benchmarks for meshing algorithms, render performance, memory usage across platforms', 'todo', 'medium', datetime('now'), datetime('now'), 42, '["testing","performance"]'),
(2, 'Cross-platform CI/CD pipeline', 'Build and test on Windows, macOS, Linux, Web. Automated releases, changelog generation', 'in_progress', 'high', datetime('now'), datetime('now'), 43, '["devops","ci-cd"]'),
(2, 'Security audit and hardening', 'Review networking code for exploits, sandboxed plugin execution, input validation', 'todo', 'high', datetime('now'), datetime('now'), 44, '["security"]'),
(2, 'Accessibility improvements', 'Screen reader support in editor, keyboard-only navigation, color blind modes, scalable UI', 'todo', 'low', datetime('now'), datetime('now'), 45, '["accessibility","ui"]');

-- Vision boards with different types
INSERT INTO vision_boards (name, description, type, status, project_id, created_by, created_at, updated_at) VALUES
('Engine Architecture Overview', 'High-level system architecture showing core modules: World, Rendering, Physics, Networking, Editor', 'architecture', 'active', 2, 1, datetime('now'), datetime('now')),
('Meshing Algorithm Comparison', 'Mind map comparing different meshing strategies: Greedy, DC, Surface Nets, Transvoxel, Ray Marching', 'mindmap', 'active', 2, 1, datetime('now'), datetime('now')),
('5-Phase Development Roadmap', 'Timeline visualization of the 5 development phases from foundation to ecosystem', 'roadmap', 'active', 2, 1, datetime('now'), datetime('now')),
('Editor UI Wireframes', 'Editor interface mockups: viewport, tools panel, scene hierarchy, inspector, asset browser', 'wireframe', 'active', 2, 1, datetime('now'), datetime('now')),
('User Flow: New Project Creation', 'Step-by-step flow for creating a new voxel game project from template to first build', 'userflow', 'active', 2, 1, datetime('now'), datetime('now')),
('Technical Brainstorming Canvas', 'Free-form whiteboard for exploring SDF integration, LOD strategies, compression schemes', 'canvas', 'draft', 2, 1, datetime('now'), datetime('now'));
