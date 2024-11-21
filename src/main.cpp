#include <iostream>
#include <memory>
#include <imgui.h>
#include "../../external/imgui/backends/imgui_impl_glfw.h"
#include "../../external/imgui/backends/imgui_impl_opengl3.h"
#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/basic_file_sink.h>
#include <spdlog/sinks/stdout_color_sinks.h>

#include "../include/ui/window.h"
#include "../include/core/project_manager.h"
#include "../include/data/database.h"

void setupLogging() {
    try {
        // Create a file logger
        auto file_logger = spdlog::basic_logger_mt("file_logger", "logs/devtrack.log");
        
        // Create a console logger
        auto console_logger = spdlog::stdout_color_mt("console");
        
        // Set default logger
        spdlog::set_default_logger(console_logger);
        
        // Set logging level
        spdlog::set_level(spdlog::level::debug);
        
        // Log pattern
        spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v");
        
        spdlog::info("DevTrack logging initialized");
    }
    catch (const spdlog::spdlog_ex& ex) {
        std::cerr << "Log initialization failed: " << ex.what() << std::endl;
    }
}

int main() {
    // Setup logging
    setupLogging();

    try {
        spdlog::info("DevTrack application starting");

        // Initialize GLFW and OpenGL
        if (!glfwInit()) {
            spdlog::critical("Failed to initialize GLFW");
            return -1;
        }

        // Create database
        DevTrack::Database projectDatabase("devtrack_projects.db");
        spdlog::info("Database initialized: devtrack_projects.db");
        
        // Create project manager
        DevTrack::ProjectManager projectManager(projectDatabase);
        spdlog::info("Project manager initialized");

        // Create window
        DevTrack::DevTrackWindow window;
        spdlog::info("Application window created");
        
        // Main application loop
        spdlog::info("Entering main application loop");
        while (!window.shouldClose()) {
            try {
                // Poll events
                glfwPollEvents();

                // Start ImGui frame
                window.startImGuiFrame();

                // Render UI
                window.renderMainUI(projectManager);

                // Render and swap buffers
                window.render();
            }
            catch (const std::exception& innerEx) {
                spdlog::error("Error in main loop: {}", innerEx.what());
            }
        }

        spdlog::info("Application closing gracefully");

        // Cleanup
        window.shutdown();
        glfwTerminate();

        return 0;
    }
    catch (const std::exception& e) {
        spdlog::critical("Fatal error: {}", e.what());
        return -1;
    }
}
