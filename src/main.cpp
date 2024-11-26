/**
 * @file main.cpp
 * @brief Entry point for the DevTrack application.
 * 
 * This file initializes all core components of DevTrack:
 * - Logging system (spdlog)
 * - Graphics (GLFW/OpenGL)
 * - UI system (Dear ImGui)
 * - Database connection
 * - Project management
 * 
 * Architecture Overview:
 * - Uses GLFW for window management and input handling
 * - OpenGL 3.3+ for rendering
 * - Dear ImGui for immediate mode GUI
 * - SQLite for persistent storage
 * - spdlog for logging
 * 
 * Error Handling:
 * - All major components are initialized in try-catch blocks
 * - Failures are logged and result in clean shutdown
 * - Resource cleanup is guaranteed through RAII
 */

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

/**
 * @brief Initializes the application logging system.
 * 
 * Sets up two logging sinks:
 * 1. File sink: Persistent logging to 'logs/devtrack.log'
 * 2. Console sink: Colored output to stdout
 * 
 * Log Configuration:
 * - Debug level enabled for development
 * - Timestamp and log level in output
 * - Color-coded based on severity
 * 
 * @throws spdlog::spdlog_ex if logging initialization fails
 */
void setupLogging() {
    try {
        // Set locale to support UTF-8
        std::locale::global(std::locale("en_US.UTF-8"));
        
        // Create a file logger with UTF-8 BOM
        auto file_logger = spdlog::basic_logger_mt("file_logger", "logs/devtrack.log");
        
        // Create a console logger
        auto console_logger = spdlog::stdout_color_mt("console");
        
        // Set default logger
        spdlog::set_default_logger(console_logger);
        
        // Set logging level
        spdlog::set_level(spdlog::level::debug);
        
        // Log pattern with UTF-8 support
        spdlog::set_pattern(u8"[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v");
        
        spdlog::info(u8"DevTrack logging initialized");
    }
    catch (const spdlog::spdlog_ex& ex) {
        std::cerr << "Log initialization failed: " << ex.what() << std::endl;
    }
    catch (const std::runtime_error& e) {
        std::cerr << "Locale setting failed: " << e.what() << std::endl;
        // Fall back to default locale if UTF-8 locale is not available
        std::locale::global(std::locale::classic());
        spdlog::warn("Failed to set UTF-8 locale, falling back to classic locale");
    }
}

/**
 * @brief Application entry point
 * @return 0 on successful execution, non-zero on error
 * 
 * Initialization Sequence:
 * 1. Setup logging system
 * 2. Initialize GLFW and OpenGL
 * 3. Create main window
 * 4. Initialize Dear ImGui
 * 5. Connect to database
 * 6. Start main application loop
 * 
 * Main Loop:
 * - Polls for input events
 * - Updates UI state
 * - Renders frame
 * - Maintains target framerate
 * 
 * Shutdown Sequence:
 * - ImGui cleanup
 * - Window destruction
 * - GLFW termination
 * - Database connection closure
 */
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
