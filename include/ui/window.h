#pragma once

#include <GLFW/glfw3.h>
#include <imgui.h>
#include "../core/project_manager.h"

namespace DevTrack {
    class DevTrackWindow {
    public:
        DevTrackWindow();
        ~DevTrackWindow();

        bool shouldClose() const;
        void startImGuiFrame();
        void renderMainUI(ProjectManager& projectManager);
        void render();
        void shutdown();

    private:
        GLFWwindow* m_window;

        void renderProjectList(ProjectManager& projectManager);
        void renderProjectDetails(Project& project);
        void renderCreateProjectModal(ProjectManager& projectManager);
    };
}
