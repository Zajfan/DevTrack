#pragma once

#include <GLFW/glfw3.h>
#include <imgui.h>
#include <string>
#include <vector>
#include "../core/project_manager.h"

namespace DevTrack {
    /**
     * @brief Main window class for the DevTrack application.
     * 
     * This class manages the application's user interface using GLFW and Dear ImGui.
     * It handles window creation, UI rendering, and user input processing.
     * 
     * Rendering Architecture:
     * - Uses GLFW for window management and OpenGL context
     * - Dear ImGui for immediate mode GUI rendering
     * - Follows a single-window design pattern
     * 
     * Performance Considerations:
     * - UI updates are locked to monitor refresh rate
     * - Heavy operations should be moved off the UI thread
     * - Consider double buffering for large data updates
     */
    class DevTrackWindow {
    public:
        /**
         * @brief Constructs the main application window.
         * 
         * Initializes:
         * - GLFW window and OpenGL context
         * - Dear ImGui context and style
         * - Default window size and properties
         * 
         * @throws std::runtime_error if window creation fails
         */
        DevTrackWindow();

        /**
         * @brief Destructor ensures proper cleanup of window resources.
         * 
         * Handles:
         * - ImGui shutdown
         * - GLFW window destruction
         * - OpenGL context cleanup
         */
        ~DevTrackWindow();

        /**
         * @brief Checks if the window should close.
         * @return true if the window should close (e.g., user clicked close button)
         */
        bool shouldClose() const;

        /**
         * @brief Prepares ImGui for a new frame.
         * 
         * Must be called once per frame before any ImGui rendering.
         * Handles input processing and frame timing.
         */
        void startImGuiFrame();

        /**
         * @brief Renders the main application UI.
         * @param projectManager Reference to the project management system
         * 
         * This is the main UI rendering function that:
         * - Updates project list and details
         * - Handles user input and interactions
         * - Manages modal dialogs and popups
         */
        void renderMainUI(ProjectManager& projectManager);

        /**
         * @brief Finalizes and presents the rendered frame.
         * 
         * Handles:
         * - ImGui render finalization
         * - Buffer swapping
         * - Frame timing
         */
        void render();

        /**
         * @brief Cleanly shuts down the window system.
         * 
         * Should be called before application exit to ensure
         * proper resource cleanup.
         */
        void shutdown();

    private:
        GLFWwindow* m_window;              ///< GLFW window handle
        bool confirmDelete;                 ///< Flag for delete confirmation dialog
        bool openCreateProjectModal;        ///< Flag for project creation dialog
        std::string projectToDelete;        ///< Name of project pending deletion
        std::vector<Project> m_cachedProjects;  ///< Cached list of projects
        bool m_needsRefresh;                ///< Flag indicating if cache needs refresh

        /**
         * @brief Refreshes the project cache from the database.
         * @param projectManager Reference to project data
         */
        void refreshProjectCache(ProjectManager& projectManager);

        /**
         * @brief Renders the list of all projects.
         * @param projectManager Reference to project data
         * 
         * Uses cached project data for display, only refreshing when needed.
         */
        void renderProjectList(ProjectManager& projectManager);

        /**
         * @brief Renders detailed view of a single project.
         * @param project Project to display
         * 
         * Shows:
         * - Project metadata
         * - Task list and progress
         * - Edit and delete options
         */
        void renderProjectDetails(Project& project);

        /**
         * @brief Renders the create project dialog.
         * @param projectManager Reference to project management system
         * 
         * Handles:
         * - Project name and description input
         * - Validation and creation
         * - Error messaging
         */
        void renderCreateProjectModal(ProjectManager& projectManager);
    };
}
