#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include "../../include/ui/window.h"
#include <imgui.h>
#include "../../external/imgui/backends/imgui_impl_glfw.h"
#include "../../external/imgui/backends/imgui_impl_opengl3.h"
#include <stdexcept>
#include <chrono>
#include "../../include/core/project_manager.h"
#include "spdlog/spdlog.h"

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
    static bool openCreateProjectModal = false;
    
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

void DevTrackWindow::renderProjectList(ProjectManager& projectManager) {
    // Fetch all projects
    auto projects = projectManager.getAllProjects();

    // Improved project list with table
    if (ImGui::BeginTable("Projects", 4, 
        ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_Resizable)) {
        
        // Table headers
        ImGui::TableSetupColumn("Project Name");
        ImGui::TableSetupColumn("Description");
        ImGui::TableSetupColumn("Status");
        ImGui::TableSetupColumn("Actions");
        ImGui::TableHeadersRow();

        for (auto& project : projects) {
            ImGui::TableNextRow();
            
            // Project Name
            ImGui::TableSetColumnIndex(0);
            ImGui::Text("%s", project.getName().c_str());

            // Description
            ImGui::TableSetColumnIndex(1);
            ImGui::Text("%s", project.getDescription().c_str());

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
                projectManager.deleteProject(project.getName());
            }
            ImGui::PopID();
        }

        ImGui::EndTable();
    }
}

void DevTrackWindow::renderProjectDetails(Project& project) {
    // Modal popup for project details
    ImGui::OpenPopup(("Project Details: " + project.getName()).c_str());
    
    if (ImGui::BeginPopupModal(("Project Details: " + project.getName()).c_str(), nullptr, 
        ImGuiWindowFlags_AlwaysAutoResize)) {
        
        ImGui::Text("Project: %s", project.getName().c_str());
        ImGui::Text("Description: %s", project.getDescription().c_str());
        
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
    if (ImGui::BeginPopupModal("Create New Project", nullptr, 
        ImGuiWindowFlags_AlwaysAutoResize)) {
        
        static char projectName[128] = "";
        static char projectDescription[512] = "";

        ImGui::InputText("Project Name", projectName, IM_ARRAYSIZE(projectName));
        ImGui::InputTextMultiline("Project Description", projectDescription, IM_ARRAYSIZE(projectDescription));

        ImGui::Separator();
        if (ImGui::Button("Create")) {
            if (strlen(projectName) == 0) {
                spdlog::warn("Project name cannot be empty");
            } else {
                try {
                    projectManager.createProject(projectName, projectDescription);
                    spdlog::info("Project created: {}", projectName);
                } catch (const std::exception& e) {
                    spdlog::error("Failed to create project: {}", e.what());
                }
                ImGui::CloseCurrentPopup();
            }
        }
        ImGui::SameLine();
        if (ImGui::Button("Cancel")) {
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
