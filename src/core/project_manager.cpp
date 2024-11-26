/**
 * @file project_manager.cpp
 * @brief Implementation of the ProjectManager class for DevTrack.
 * 
 * This file implements the core project management functionality:
 * - Project CRUD operations
 * - Task management
 * - Database interaction
 * - Error handling and logging
 * 
 * Design Pattern:
 * - Follows Repository pattern for data access
 * - Uses RAII for resource management
 * - Implements exception-safe operations
 */

#include "../../include/core/project_manager.h"
#include <algorithm>
#include <stdexcept>
#include "spdlog/spdlog.h"

namespace DevTrack {

/**
 * @brief Constructs a ProjectManager instance.
 * 
 * Implementation Details:
 * - Stores reference to database
 * - Initializes logging for project operations
 * - No direct database operations in constructor
 */
ProjectManager::ProjectManager(Database& database) 
    : m_database(database) {
    spdlog::debug("Project manager initialized with database");
}

/**
 * @brief Creates a new project with the given name and description.
 * 
 * Implementation Details:
 * - Creates project in memory first
 * - Persists to database if creation successful
 * - Logs operation outcome
 * 
 * Exception Safety:
 * - Strong guarantee (no changes if operation fails)
 * - Logs errors before re-throwing
 */
bool ProjectManager::createProject(const std::string& name, const std::string& description) {
    try {
        // Create and store new project
        auto newProject = std::make_unique<Project>(name, description);
        m_database.insertProject(*newProject);
        spdlog::debug(u8"Project created and stored in database: {}", name);
        return true;
    } catch (const std::exception& e) {
        spdlog::error(u8"Error creating project: {}", e.what());
        return false;
    }
}

/**
 * @brief Deletes a project by name.
 * 
 * Implementation Details:
 * - Direct database operation
 * - Cascading delete (removes all associated tasks)
 * - Logs operation for tracking
 * 
 * Exception Safety:
 * - Basic guarantee (database remains consistent)
 * - Logs errors before re-throwing
 */
bool ProjectManager::deleteProject(const std::string& name) {
    try {
        spdlog::debug(u8"Starting project deletion process for: {}", name);
        m_database.deleteProject(name);
        spdlog::info(u8"Project successfully deleted from database: {}", name);
        return true;
    } catch (const std::exception& e) {
        spdlog::error(u8"Error deleting project '{}': {}", name, e.what());
        return false;
    }
}

/**
 * @brief Updates an existing project's details.
 * 
 * Implementation Details:
 * - Updates entire project state
 * - Maintains task relationships
 * - Logs operation outcome
 * 
 * Exception Safety:
 * - Strong guarantee for metadata updates
 * - Basic guarantee for task updates
 */
void ProjectManager::updateProject(const Project& project) {
    try {
        m_database.updateProject(project);
        spdlog::debug("Project updated in database: {}", project.getName());
    } catch (const std::exception& e) {
        spdlog::error("Error updating project: {}", e.what());
        throw;
    }
}

/**
 * @brief Retrieves all projects from the database.
 * 
 * Implementation Details:
 * - Direct database query
 * - Returns by value for thread safety
 * - Logs query performance
 * 
 * Performance Note:
 * - Consider implementing pagination for large datasets
 * - Could add caching for frequently accessed projects
 */
std::vector<Project> ProjectManager::getAllProjects() const {
    try {
        auto projects = m_database.loadAllProjects();
        spdlog::debug(u8"Loaded {} projects from database", projects.size());
        return projects;
    } catch (const std::exception& e) {
        spdlog::error(u8"Error loading projects: {}", e.what());
        throw;
    }
}

/**
 * @brief Retrieves a specific project by name.
 * 
 * Implementation Details:
 * - Direct database lookup
 * - Returns by value for safety
 * - Includes all project tasks
 * 
 * Exception Safety:
 * - Throws if project not found
 * - Logs access attempts
 */
Project ProjectManager::getProjectByName(const std::string& name) const {
    try {
        auto projects = m_database.loadAllProjects();
        auto it = std::find_if(projects.begin(), projects.end(),
            [&name](const Project& project) {
                return project.getName() == name;
            });

        if (it == projects.end()) {
            throw std::runtime_error("Project not found");
        }

        return *it;
    } catch (const std::exception& e) {
        spdlog::error("Error getting project by name: {}", e.what());
        throw;
    }
}

/**
 * @brief Adds a task to an existing project.
 * 
 * Implementation Details:
 * - Validates project existence
 * - Updates project status
 * - Persists changes to database
 * 
 * Exception Safety:
 * - Strong guarantee (no changes if fails)
 * - Logs task creation attempts
 */
void ProjectManager::addTaskToProject(const std::string& projectName, const Task& task) {
    try {
        auto project = getProjectByName(projectName);
        project.addTask(task);
        m_database.updateProject(project);
        spdlog::debug("Task added to project {} in database", projectName);
    } catch (const std::exception& e) {
        spdlog::error("Error adding task to project: {}", e.what());
        throw;
    }
}

/**
 * @brief Updates task progress within a project.
 * 
 * Implementation Details:
 * - Updates task progress
 * - Recalculates project status
 * - Persists all changes
 * 
 * Exception Safety:
 * - Basic guarantee (progress update atomic)
 * - Logs progress updates
 */
void ProjectManager::updateTaskProgress(const std::string& projectName, 
                                      const std::string& taskName, 
                                      double progress) {
    try {
        auto project = getProjectByName(projectName);
        project.updateTaskProgress(taskName, progress);
        m_database.updateProject(project);
        spdlog::debug("Task progress updated in project {} in database", projectName);
    } catch (const std::exception& e) {
        spdlog::error("Error updating task progress: {}", e.what());
        throw;
    }
}

} // namespace DevTrack
