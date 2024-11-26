#pragma once

#include <vector>
#include <memory>
#include <string>

#include "project.h"
#include "../data/database.h"

namespace DevTrack {
    /**
     * @brief Manages project-related operations and storage.
     * 
     * @note Design Decision (2024):
     * Currently, this class directly interfaces with the database for all operations
     * without maintaining an in-memory cache. This decision was made for simplicity
     * and maintainability in the early stages of development.
     * 
     * Future Optimization Opportunities:
     * - If the application scales to handle hundreds/thousands of projects
     * - If there's a high read-to-write ratio requiring faster access
     * - If batch operations across multiple projects become common
     * Consider adding an in-memory cache (e.g., std::vector<std::unique_ptr<Project>>)
     * with appropriate cache invalidation and synchronization strategies.
     */
    class ProjectManager {
    public:
        /**
         * @brief Constructs a ProjectManager instance.
         * @param database Reference to the database instance for project storage.
         * 
         * The ProjectManager takes ownership of database operations but not the database
         * instance itself. The database's lifecycle should be managed externally.
         */
        ProjectManager(Database& database);

        /**
         * @brief Creates a new project with the given name and description.
         * @param name The unique name for the new project.
         * @param description The description of the new project.
         * @return true if project creation was successful, false if project already exists
         * or database operation failed.
         * 
         * This operation directly creates the project in the database without any
         * intermediate caching. Ensures project names are unique across the system.
         */
        bool createProject(const std::string& name, const std::string& description);

        /**
         * @brief Deletes a project by its name.
         * @param name The name of the project to delete.
         * @return true if project was successfully deleted, false if project doesn't exist
         * or database operation failed.
         * 
         * This is a cascading delete operation - it will remove the project and all
         * associated data (tasks, etc.) from the database.
         */
        bool deleteProject(const std::string& name);

        /**
         * @brief Updates a project with the given project details.
         * @param project The project to update.
         * 
         * This operation updates the project in the database directly.
         */
        void updateProject(const Project& project);

        /**
         * @brief Adds a task to a project.
         * @param projectName The name of the project to add the task to.
         * @param task The task to add.
         * 
         * This operation directly adds the task to the project in the database.
         */
        void addTaskToProject(const std::string& projectName, const Task& task);

        /**
         * @brief Updates the progress of a task in a project.
         * @param projectName The name of the project containing the task.
         * @param taskName The name of the task to update.
         * @param progress The new progress of the task.
         * 
         * This operation directly updates the task's progress in the database.
         */
        void updateTaskProgress(const std::string& projectName, const std::string& taskName, double progress);

        /**
         * @brief Retrieves all projects from the database.
         * @return Vector of Project objects representing all stored projects.
         * 
         * This operation performs a fresh database query each time it's called.
         * If performance becomes a concern with large datasets, consider implementing
         * caching or pagination strategies.
         */
        std::vector<Project> getAllProjects() const;

        /**
         * @brief Retrieves a specific project by its name.
         * @param name The name of the project to retrieve.
         * @return Project object if found, throws std::runtime_error if project doesn't exist.
         * 
         * Direct database lookup operation. Consider caching frequently accessed projects
         * if this becomes a performance bottleneck.
         */
        Project getProjectByName(const std::string& name) const;

    private:
        /**
         * @brief Reference to the database instance.
         * 
         * All project operations are delegated to this database instance.
         * The database handles all persistence and data integrity concerns.
         */
        Database& m_database;
    };
}
