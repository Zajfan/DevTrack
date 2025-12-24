/**
 * Seed data for Project Voxel
 * This will be executed from the main process via IPC
 */

export interface SeedTask {
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  phase: string;
  tags: string;
}

export interface SeedBoard {
  name: string;
  description: string;
  type: 'roadmap' | 'mindmap' | 'canvas' | 'wireframe' | 'architecture' | 'userflow' | 'custom';
}

export interface SeedLabel {
  name: string;
  color: string;
}

export const PROJECT_UPDATE = {
  description: 'A modular voxel game engine and editor inspired by Minecraft, built with modern C++20/23 and designed for extensibility, performance, and cross-platform deployment.',
  
  conceptWhat: `# Core Engine Components
- Multi-scale voxel rendering system (LOD management)
- Chunk-based world management with async loading
- Modular meshing algorithms (Greedy, DC, Surface Nets, Transvoxel, SVO, Ray Marching)
- Plugin-based architecture for game logic
- Visual editor with real-time preview
- Asset pipeline for voxel models and textures

# Game Features
- Infinite procedurally generated worlds
- Cave generation with multi-octave noise
- Block placement and destruction
- Physics simulation
- Multiplayer networking (future)

# Editor Features
- Visual voxel editing tools
- Real-time rendering preview
- Material and texture management
- World generation parameter tweaking
- Performance profiling tools`,

  conceptHow: `# Architecture
- **Multi-scale voxel system**: Adaptive LOD with seamless transitions
- **Chunk management**: 16x16x256 chunks with async background loading
- **Meshing pipeline**: Pluggable algorithms (Greedy Meshing default, DC/Surface Nets/Transvoxel optional)
- **ECS pattern**: Entity-Component-System for game objects
- **Rendering**: Abstracted renderer (Vulkan primary, Metal/DirectX12 future)

# Technologies
- **Language**: C++20/23 (modules, concepts, ranges)
- **Build**: CMake with vcpkg for dependencies
- **Graphics**: Vulkan 1.3+ with vk-bootstrap
- **Math**: GLM for vector/matrix operations
- **Windowing**: GLFW 3.3+
- **Noise**: FastNoise2 for procedural generation
- **Threading**: std::jthread, std::async, thread pools

# Development Phases
1. Core engine foundation (chunk system, basic rendering)
2. Meshing algorithm implementation
3. World generation and caves
4. Editor UI and tools
5. Performance optimization and profiling
6. Advanced features (physics, networking)`,

  conceptWhere: `# Target Platforms
- **Primary**: Linux (development platform)
- **Secondary**: Windows 10/11, macOS (Apple Silicon + Intel)
- **Future**: Web (via WebGPU), Mobile (Vulkan Mobile)

# Distribution
- **Engine**: Open-source library (MIT/Apache 2.0)
- **Editor**: Standalone application with installers
- **Games**: Packaged executables with engine runtime

# Development Environment
- Primary: Linux (Arch/Ubuntu) with Vulkan SDK
- IDEs: VS Code, CLion, Visual Studio 2022
- Version Control: Git with GitKraken/GitHub

# Deployment Architecture
- Engine as shared library (.so/.dll/.dylib)
- Games link against engine
- Editor as separate executable
- Asset pipeline exports optimized formats`,

  conceptWithWhat: `# Core Dependencies
- **Vulkan SDK** 1.3.280+ (graphics API)
- **GLFW** 3.3.8+ (windowing and input)
- **GLM** 0.9.9+ (mathematics)
- **FastNoise2** (procedural generation)
- **vk-bootstrap** (Vulkan initialization)
- **stb_image** (texture loading)
- **EnTT** (Entity-Component-System)
- **spdlog** (logging)

# Optional Algorithms
- **Dual Contouring** (smooth voxels)
- **Surface Nets** (smooth isosurfaces)
- **Transvoxel** (seamless LOD transitions)
- **Sparse Voxel Octrees** (large-scale optimization)
- **Ray Marching** (SDF-based rendering)

# Development Tools
- **CMake** 3.26+ (build system)
- **vcpkg** (package manager)
- **Compiler**: GCC 13+, Clang 16+, MSVC 2022+
- **Debugger**: GDB, LLDB, Visual Studio Debugger
- **Profiler**: Tracy, RenderDoc, Nsight Graphics

# Editor Framework (Future)
- **Dear ImGui** (UI framework)
- **ImGuizmo** (3D gizmos)
- **NFD** (file dialogs)`,

  conceptWhen: `# Phase 1: Foundation (Months 1-3)
- ✅ Basic window and Vulkan initialization
- ✅ Chunk system with coordinate management
- ✅ Simple cube rendering
- ✅ Camera controls and movement
- ✅ Async chunk loading
- ⏳ Greedy meshing implementation

# Phase 2: Core Features (Months 4-6)
- World generation with Perlin noise
- Cave generation with multi-octave noise
- Block placement and destruction
- Save/load system for worlds
- Frustum culling optimization

# Phase 3: Advanced Rendering (Months 7-9)
- Multiple meshing algorithm support
- LOD system with distance-based switching
- Ambient occlusion
- Lighting system (sunlight, block light)
- Texture atlas and materials

# Phase 4: Editor Development (Months 10-12)
- ImGui integration
- Visual voxel editing tools
- Real-time preview window
- Asset browser and management
- Performance profiling overlay

# Phase 5: Polish & Optimization (Months 13-18)
- Multi-threading optimization
- Memory management tuning
- Renderer abstraction (Metal, DX12)
- Cross-platform packaging
- Documentation and examples

# Long-term (18+ months)
- Physics engine integration
- Multiplayer networking
- Scripting support (Lua/Wren)
- Modding API and tools`,

  conceptWhy: `# Vision
Create a modern, performant voxel engine that democratizes voxel game development by providing:
- **Flexibility**: Multiple meshing algorithms for different use cases
- **Performance**: Multi-threaded, GPU-optimized rendering
- **Extensibility**: Plugin architecture for custom game logic
- **Education**: Well-documented codebase for learning graphics programming

# Problems Solved
1. **Fragmentation**: Consolidate scattered voxel rendering knowledge
2. **Performance**: Address slow meshing and rendering in existing engines
3. **Modularity**: Enable easy experimentation with different techniques
4. **Accessibility**: Lower barrier to voxel game development

# Target Audience
- **Indie game developers** building voxel games
- **Graphics programmers** learning rendering techniques
- **Students** studying game engine architecture
- **Hobbyists** creating Minecraft-like experiences

# Unique Value Proposition
Unlike Minecraft (closed-source, Java) or Minetest (C++, but monolithic):
- Modern C++20/23 with clean architecture
- Multiple meshing algorithms in one engine
- Designed for both games AND educational purposes
- Cross-platform with native performance
- Editor-first workflow for rapid iteration

# Success Metrics
- 1000+ GitHub stars in first year
- Active community contributions
- 5+ games built with the engine
- Used in university graphics courses`
};

export const TASKS: SeedTask[] = [
  // Phase 1: Foundation
  {
    title: 'Set up Vulkan initialization with vk-bootstrap',
    description: 'Initialize Vulkan instance, select physical device, create logical device and swapchain using vk-bootstrap library for simplified setup.',
    status: 'completed',
    priority: 'high',
    phase: 'Phase 1: Foundation',
    tags: 'rendering,vulkan,initialization'
  },
  {
    title: 'Implement chunk coordinate system',
    description: 'Create ChunkPos and BlockPos classes with proper coordinate transformations between world space, chunk space, and local block space.',
    status: 'completed',
    priority: 'high',
    phase: 'Phase 1: Foundation',
    tags: 'core,world,coordinates'
  },
  {
    title: 'Build basic cube mesh rendering',
    description: 'Render simple textured cubes using vertex buffers, index buffers, and a basic shader pipeline.',
    status: 'completed',
    priority: 'high',
    phase: 'Phase 1: Foundation',
    tags: 'rendering,mesh,vulkan'
  },
  {
    title: 'Implement first-person camera controls',
    description: 'Create camera class with WASD movement, mouse look, and projection matrix updates.',
    status: 'completed',
    priority: 'medium',
    phase: 'Phase 1: Foundation',
    tags: 'camera,input,controls'
  },
  {
    title: 'Add async chunk loading system',
    description: 'Implement background thread pool for generating and meshing chunks without blocking main rendering thread.',
    status: 'completed',
    priority: 'high',
    phase: 'Phase 1: Foundation',
    tags: 'multithreading,async,performance'
  },
  {
    title: 'Implement greedy meshing algorithm',
    description: 'Optimize chunk rendering by merging adjacent faces of same block type to reduce vertex count.',
    status: 'in_progress',
    priority: 'high',
    phase: 'Phase 1: Foundation',
    tags: 'meshing,optimization,algorithm'
  },

  // Phase 2: Core Features
  {
    title: 'Integrate FastNoise2 for terrain generation',
    description: 'Use 3D Perlin noise to generate natural-looking terrain with hills, valleys, and varied height maps.',
    status: 'todo',
    priority: 'high',
    phase: 'Phase 2: Core Features',
    tags: 'worldgen,noise,procedural'
  },
  {
    title: 'Implement cave generation system',
    description: 'Use multi-octave 3D noise (worm caves + caverns) to create underground cave systems with varying sizes.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 2: Core Features',
    tags: 'worldgen,caves,procedural'
  },
  {
    title: 'Add block placement and destruction',
    description: 'Raycast from camera to detect block hits, allow adding/removing blocks with mouse clicks.',
    status: 'todo',
    priority: 'high',
    phase: 'Phase 2: Core Features',
    tags: 'gameplay,interaction,raycasting'
  },
  {
    title: 'Build world save/load system',
    description: 'Serialize chunk data to disk with compression, load chunks on demand from saved files.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 2: Core Features',
    tags: 'persistence,serialization,io'
  },
  {
    title: 'Implement frustum culling',
    description: 'Cull chunks outside camera view frustum to avoid rendering invisible geometry.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 2: Core Features',
    tags: 'optimization,rendering,culling'
  },

  // Phase 3: Advanced Rendering
  {
    title: 'Add Dual Contouring meshing algorithm',
    description: 'Implement DC algorithm for smooth voxel surfaces with sharp features, useful for terrain and organic shapes.',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 3: Advanced Rendering',
    tags: 'meshing,algorithm,smooth-voxels'
  },
  {
    title: 'Implement Surface Nets algorithm',
    description: 'Add Surface Nets for fast smooth isosurface extraction, alternative to Dual Contouring.',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 3: Advanced Rendering',
    tags: 'meshing,algorithm,smooth-voxels'
  },
  {
    title: 'Add Transvoxel LOD transitions',
    description: 'Implement Transvoxel algorithm to eliminate cracks between chunks at different LOD levels.',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 3: Advanced Rendering',
    tags: 'meshing,lod,algorithm'
  },
  {
    title: 'Build multi-scale LOD system',
    description: 'Dynamically adjust chunk detail based on distance from camera, with seamless transitions.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 3: Advanced Rendering',
    tags: 'lod,optimization,rendering'
  },
  {
    title: 'Implement ambient occlusion',
    description: 'Add per-vertex AO to darken corners and crevices for better depth perception.',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 3: Advanced Rendering',
    tags: 'lighting,shading,quality'
  },
  {
    title: 'Add lighting system (sunlight + block light)',
    description: 'Implement light propagation through chunks with smooth falloff and colored light sources.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 3: Advanced Rendering',
    tags: 'lighting,shading,gameplay'
  },
  {
    title: 'Create texture atlas system',
    description: 'Pack all block textures into single atlas, generate UVs for efficient GPU rendering.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 3: Advanced Rendering',
    tags: 'textures,rendering,assets'
  },

  // Phase 4: Editor Development
  {
    title: 'Integrate Dear ImGui',
    description: 'Set up ImGui with Vulkan backend for editor UI framework.',
    status: 'todo',
    priority: 'high',
    phase: 'Phase 4: Editor Development',
    tags: 'editor,ui,imgui'
  },
  {
    title: 'Build voxel painting tools',
    description: 'Create brush tools for adding/removing voxels with adjustable size and shape.',
    status: 'todo',
    priority: 'high',
    phase: 'Phase 4: Editor Development',
    tags: 'editor,tools,painting'
  },
  {
    title: 'Add real-time preview window',
    description: 'Split-screen view showing both edit mode and game preview simultaneously.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 4: Editor Development',
    tags: 'editor,ui,preview'
  },
  {
    title: 'Create asset browser',
    description: 'File browser for voxel models, textures, and world saves with thumbnail previews.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 4: Editor Development',
    tags: 'editor,assets,ui'
  },
  {
    title: 'Add performance profiling overlay',
    description: 'Display FPS, frame time, memory usage, chunk count, and rendering stats with Tracy integration.',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 4: Editor Development',
    tags: 'editor,profiling,performance'
  },

  // Phase 5: Polish & Optimization
  {
    title: 'Optimize multi-threading for chunk generation',
    description: 'Fine-tune thread pool, implement lock-free queues, minimize contention.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 5: Polish',
    tags: 'performance,multithreading,optimization'
  },
  {
    title: 'Implement memory pooling for chunks',
    description: 'Reduce allocations with custom allocators and object pools for chunk data.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 5: Polish',
    tags: 'performance,memory,optimization'
  },
  {
    title: 'Add Metal renderer backend',
    description: 'Abstract renderer interface, implement Metal backend for macOS.',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 5: Polish',
    tags: 'rendering,metal,cross-platform'
  },
  {
    title: 'Add DirectX 12 renderer backend',
    description: 'Implement DX12 backend for Windows, share most code with Vulkan via abstraction.',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 5: Polish',
    tags: 'rendering,directx,cross-platform'
  },
  {
    title: 'Create installers for all platforms',
    description: 'Package engine and editor with installers (AppImage, MSI, DMG).',
    status: 'todo',
    priority: 'low',
    phase: 'Phase 5: Polish',
    tags: 'deployment,packaging,release'
  },
  {
    title: 'Write comprehensive documentation',
    description: 'API docs, architecture guides, tutorials, and example projects.',
    status: 'todo',
    priority: 'medium',
    phase: 'Phase 5: Polish',
    tags: 'documentation,examples,tutorials'
  },

  // Long-term features
  {
    title: 'Integrate physics engine (Jolt or PhysX)',
    description: 'Add rigid body physics for entities, collision detection with voxel terrain.',
    status: 'todo',
    priority: 'low',
    phase: 'Future',
    tags: 'physics,gameplay,integration'
  },
  {
    title: 'Implement multiplayer networking',
    description: 'Client-server architecture with chunk synchronization and entity replication.',
    status: 'todo',
    priority: 'low',
    phase: 'Future',
    tags: 'networking,multiplayer,server'
  },
  {
    title: 'Add Lua scripting support',
    description: 'Embed Lua for game logic, expose engine API for modding.',
    status: 'todo',
    priority: 'low',
    phase: 'Future',
    tags: 'scripting,modding,lua'
  },
  {
    title: 'Create modding SDK and tools',
    description: 'Plugin system, mod loader, example mods, and modding documentation.',
    status: 'todo',
    priority: 'low',
    phase: 'Future',
    tags: 'modding,sdk,community'
  }
];

export const BOARDS: SeedBoard[] = [
  {
    name: 'Engine Architecture Overview',
    description: 'High-level architecture diagram showing core systems: chunk management, rendering pipeline, meshing algorithms, and world generation.',
    type: 'architecture'
  },
  {
    name: 'Development Roadmap Timeline',
    description: 'Visual timeline of development phases from foundation through polish and future features.',
    type: 'roadmap'
  },
  {
    name: 'Meshing Algorithm Comparison',
    description: 'Mind map comparing different meshing algorithms: Greedy, Dual Contouring, Surface Nets, Transvoxel, SVO, and Ray Marching.',
    type: 'mindmap'
  },
  {
    name: 'Editor UI Wireframe',
    description: 'Wireframe mockup of the voxel editor interface with tool panels, viewport, and asset browser.',
    type: 'wireframe'
  },
  {
    name: 'Multi-Scale LOD System',
    description: 'Diagram showing how chunks transition between LOD levels based on distance from camera.',
    type: 'architecture'
  },
  {
    name: 'User Workflow: Creating a Voxel World',
    description: 'User flow diagram from opening editor → configuring world gen → editing terrain → saving/playing.',
    type: 'userflow'
  }
];

export const LABELS: SeedLabel[] = [
  { name: 'Phase 1', color: '#22c55e' },
  { name: 'Phase 2', color: '#3b82f6' },
  { name: 'Phase 3', color: '#a855f7' },
  { name: 'Phase 4', color: '#f59e0b' },
  { name: 'Phase 5', color: '#ef4444' },
  { name: 'Rendering', color: '#06b6d4' },
  { name: 'World Gen', color: '#10b981' },
  { name: 'Editor', color: '#f97316' },
  { name: 'Optimization', color: '#8b5cf6' },
  { name: 'Bug', color: '#dc2626' },
  { name: 'Enhancement', color: '#0ea5e9' },
  { name: 'Documentation', color: '#64748b' }
];
