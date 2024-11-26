#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include "../../include/ui/window.h"
#include <imgui.h>
#include <spdlog/spdlog.h>
#include "../../external/imgui/backends/imgui_impl_glfw.h"
#include "../../external/imgui/backends/imgui_impl_opengl3.h"
#include <stdexcept>
#include <chrono>
#include "../../include/core/project_manager.h"

namespace DevTrack {

DevTrackWindow::DevTrackWindow() {
    // Initialize GLFW
    if (!glfwInit()) {
        throw std::runtime_error("Failed to initialize GLFW");
    }

    // Set OpenGL version (3.3 Core Profile)
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    // Create window
    m_window = glfwCreateWindow(1280, 720, "DevTrack: Personal Development Project Manager", nullptr, nullptr);
    if (!m_window) {
        glfwTerminate();
        throw std::runtime_error("Failed to create GLFW window");
    }

    // Make OpenGL context current
    glfwMakeContextCurrent(m_window);
    glfwSwapInterval(1); // Enable vsync

    // Initialize GLEW
    if (glewInit() != GLEW_OK) {
        throw std::runtime_error("Failed to initialize GLEW");
    }

    // Setup ImGui context
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO(); (void)io;
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;

    // Setup Platform/Renderer bindings
    ImGui_ImplGlfw_InitForOpenGL(m_window, true);
    ImGui_ImplOpenGL3_Init("#version 330");

    // Setup ImGui style
    ImGui::StyleColorsDark();

    // Initialize member variables
    openCreateProjectModal = false;
    projectToDelete = "";
    confirmDelete = false;
    m_needsRefresh = true;  // Initial refresh needed
}

DevTrackWindow::~DevTrackWindow() {
    shutdown();
}

bool DevTrackWindow::shouldClose() const {
    return glfwWindowShouldClose(m_window);
}

void DevTrackWindow::startImGuiFrame() {
    // Poll events
    glfwPollEvents();

    // Start ImGui frame
    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();
}

void DevTrackWindow::renderMainUI(ProjectManager& projectManager) {
    // Main ImGui window
    ImGui::Begin("DevTrack: Project Management", nullptr, 
        ImGuiWindowFlags_MenuBar | ImGuiWindowFlags_NoCollapse);

    // Menu Bar
    if (ImGui::BeginMenuBar()) {
        if (ImGui::BeginMenu("File")) {
            if (ImGui::MenuItem("New Project", "Ctrl+N")) {
                spdlog::info("New Project menu item selected");
                openCreateProjectModal = true;
            }
            if (ImGui::MenuItem("Exit", "Alt+F4")) {
                glfwSetWindowShouldClose(m_window, true);
            }
            ImGui::EndMenu();
        }
        ImGui::EndMenuBar();
    }

    // Open the modal if the flag is set
    if (openCreateProjectModal) {
        spdlog::info("Opening Create New Project modal");
        ImGui::OpenPopup("Create New Project");
        openCreateProjectModal = false;
    }

    // Render the create project modal
    renderCreateProjectModal(projectManager);

    // Project List Section
    ImGui::Text("Your Projects");
    ImGui::Separator();

    renderProjectList(projectManager);

    ImGui::End();
}

void DevTrackWindow::refreshProjectCache(ProjectManager& projectManager) {
    if (m_needsRefresh) {
        m_cachedProjects = projectManager.getAllProjects();
        m_needsRefresh = false;
        spdlog::debug("Project cache refreshed. {} projects loaded.", m_cachedProjects.size());
    }
}

void DevTrackWindow::renderProjectList(ProjectManager& projectManager) {
    // Refresh cache if needed
    refreshProjectCache(projectManager);

    // Improved project list with table
    if (ImGui::BeginTable("Projects", 4, 
        ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_Resizable)) {
        
        // Table headers
        ImGui::TableSetupColumn(u8"Project Name", ImGuiTableColumnFlags_WidthStretch);
        ImGui::TableSetupColumn(u8"Description", ImGuiTableColumnFlags_WidthStretch);
        ImGui::TableSetupColumn(u8"Status", ImGuiTableColumnFlags_WidthFixed);
        ImGui::TableSetupColumn(u8"Actions", ImGuiTableColumnFlags_WidthFixed);
        ImGui::TableHeadersRow();

        for (auto& project : m_cachedProjects) {
            ImGui::TableNextRow();
            
            // Project Name
            ImGui::TableSetColumnIndex(0);
            float wrapWidth = ImGui::GetColumnWidth();
            if (wrapWidth < 0) wrapWidth = 100.0f;
            ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + wrapWidth);
            std::string projectName = project.getName();
            ImGui::Text(u8"%s", projectName.c_str());
            ImGui::PopTextWrapPos();

            // Description
            ImGui::TableSetColumnIndex(1);
            wrapWidth = ImGui::GetColumnWidth();
            if (wrapWidth < 0) wrapWidth = 200.0f;
            ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + wrapWidth);
            std::string projectDesc = project.getDescription();
            ImGui::Text(u8"%s", projectDesc.c_str());
            ImGui::PopTextWrapPos();

            // Status
            ImGui::TableSetColumnIndex(2);
            const char* statusText = "";
            ImVec4 statusColor = ImVec4(1,1,1,1);
            switch (project.getStatus()) {
                case ProjectStatus::NOT_STARTED: 
                    statusText = "Not Started"; 
                    statusColor = ImVec4(0.8f, 0.8f, 0.8f, 1.0f);
                    break;
                case ProjectStatus::IN_PROGRESS: 
                    statusText = "In Progress"; 
                    statusColor = ImVec4(0.0f, 0.7f, 0.2f, 1.0f);
                    break;
                case ProjectStatus::PAUSED: 
                    statusText = "Paused"; 
                    statusColor = ImVec4(1.0f, 0.6f, 0.0f, 1.0f);
                    break;
                case ProjectStatus::COMPLETED: 
                    statusText = "Completed"; 
                    statusColor = ImVec4(0.0f, 0.5f, 1.0f, 1.0f);
                    break;
            }
            ImGui::TextColored(statusColor, "%s", statusText);

            // Actions
            ImGui::TableSetColumnIndex(3);
            ImGui::PushID(project.getName().c_str());
            
            if (ImGui::Button("View")) {
                renderProjectDetails(project);
            }
            
            ImGui::SameLine();
            
            if (ImGui::Button("Delete")) {
                projectToDelete = project.getName();
                spdlog::debug(u8"Setting project to delete: {}", projectToDelete);
                ImGui::OpenPopup(u8"Delete Project?");
            }
            
            ImGui::PopID();
        }

        ImGui::EndTable();
    }

    // Confirmation popup
    if (ImGui::BeginPopupModal(u8"Delete Project?", nullptr, ImGuiWindowFlags_AlwaysAutoResize)) {
        if (!projectToDelete.empty()) {
            ImGui::Text(u8"Are you sure you want to delete project: %s?", projectToDelete.c_str());
            ImGui::Text(u8"This action cannot be undone.");
            
            if (ImGui::Button(u8"Yes, Delete")) {
                spdlog::debug(u8"Attempting to delete project: {}", projectToDelete);
                if (projectManager.deleteProject(projectToDelete)) {
                    spdlog::info(u8"Project deleted successfully: {}", projectToDelete);
                    m_needsRefresh = true;  // Mark cache for refresh after deletion
                    refreshProjectCache(projectManager);  // Immediately refresh the cache
                } else {
                    spdlog::error(u8"Failed to delete project: {}", projectToDelete);
                }
                projectToDelete.clear();
                ImGui::CloseCurrentPopup();
            }
            
            ImGui::SameLine();
            if (ImGui::Button(u8"No, Cancel")) {
                projectToDelete.clear();
                ImGui::CloseCurrentPopup();
            }
        }
        
        ImGui::EndPopup();
    }
}

void DevTrackWindow::renderProjectDetails(Project& project) {
    std::string modalTitle = u8"Project Details: " + project.getName();
    ImGui::OpenPopup(modalTitle.c_str());
    
    if (ImGui::BeginPopupModal(modalTitle.c_str(), nullptr, 
        ImGuiWindowFlags_AlwaysAutoResize)) {
        
        float windowWidth = ImGui::GetWindowWidth();
        float textWidth = windowWidth - 40.0f; // Leave some padding
        
        // Project name and description with proper text wrapping
        ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + textWidth);
        ImGui::Text(u8"Project: %s", project.getName().c_str());
        ImGui::Text(u8"Description: %s", project.getDescription().c_str());
        ImGui::PopTextWrapPos();
        
        ImGui::Separator();
        ImGui::Text("Tasks:");

        // Tasks list
        for (auto& task : project.getTasks()) {
            ImGui::ProgressBar(task.progress / 100.0f, ImVec2(0.0f, 0.0f), 
                (task.name + " (" + std::to_string(static_cast<int>(task.progress)) + "%)").c_str());
        }

        ImGui::Separator();
        if (ImGui::Button("Close")) {
            ImGui::CloseCurrentPopup();
        }

        ImGui::EndPopup();
    }
}

void DevTrackWindow::renderCreateProjectModal(ProjectManager& projectManager) {
    // Modal for creating a new project
    if (ImGui::BeginPopupModal(u8"Create New Project", nullptr, 
        ImGuiWindowFlags_AlwaysAutoResize)) {
        
        static char projectName[256] = "";  // Increased buffer size
        static char projectDescription[1024] = "";  // Increased buffer size

        // Add input validation hint
        ImGui::TextDisabled("(?)");
        if (ImGui::IsItemHovered()) {
            ImGui::BeginTooltip();
            ImGui::Text("Project name must not be empty and can contain up to 255 characters");
            ImGui::EndTooltip();
        }
        
        ImGui::InputText(u8"Project Name", projectName, IM_ARRAYSIZE(projectName));
        ImGui::InputTextMultiline(u8"Project Description", projectDescription, IM_ARRAYSIZE(projectDescription));

        ImGui::Separator();
        if (ImGui::Button("Create")) {
            if (strlen(projectName) == 0) {
                spdlog::warn("Project name cannot be empty");
            } else {
                if (projectManager.createProject(projectName, projectDescription)) {
                    spdlog::info(u8"Project created successfully: {}", projectName);
                    m_needsRefresh = true;  // Mark cache for refresh after creation
                    // Clear the input fields
                    projectName[0] = '\0';
                    projectDescription[0] = '\0';
                    ImGui::CloseCurrentPopup();
                }
            }
        }
        ImGui::SameLine();
        if (ImGui::Button("Cancel")) {
            // Clear the input fields
            projectName[0] = '\0';
            projectDescription[0] = '\0';
            ImGui::CloseCurrentPopup();
        }

        ImGui::EndPopup();
    }
}

void DevTrackWindow::render() {
    // Clear the screen
    glClearColor(0.2f, 0.2f, 0.2f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    // Render ImGui
    ImGui::Render();
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    // Swap buffers
    glfwSwapBuffers(m_window);
}

void DevTrackWindow::shutdown() {
    // Cleanup ImGui
    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();

    // Destroy window and terminate GLFW
    glfwDestroyWindow(m_window);
    glfwTerminate();
}

} // namespace DevTrack
