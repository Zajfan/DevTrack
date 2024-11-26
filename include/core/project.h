#pragma once

#include <string>
#include <vector>
#include <chrono>

namespace DevTrack {
    /**
     * @brief Represents the current state of a project or task.
     * 
     * This enum is used to track the lifecycle of both projects and tasks,
     * enabling consistent status reporting across the application.
     */
    enum class ProjectStatus {
        NOT_STARTED,    ///< Work has not yet begun
        IN_PROGRESS,    ///< Currently being worked on
        PAUSED,         ///< Temporarily halted
        COMPLETED       ///< All work has been completed
    };

    /**
     * @brief Represents a single task within a project.
     * 
     * Tasks are the fundamental unit of work in DevTrack. They track individual
     * pieces of work that need to be completed within a project.
     * 
     * Performance Note:
     * - Tasks are designed to be lightweight
     * - Consider using std::string_view for name/description if memory becomes a concern
     */
    struct Task {
        std::string name;                             ///< Unique name within the project
        std::string description;                      ///< Detailed task description
        ProjectStatus status;                         ///< Current task status
        std::chrono::system_clock::time_point deadline; ///< Task completion deadline
        double progress;                              ///< Progress percentage (0-100)
    };

    /**
     * @brief Represents a project in the DevTrack system.
     * 
     * Projects are the main organizational unit in DevTrack. Each project can
     * contain multiple tasks and maintains its own status and progress tracking.
     * 
     * Thread Safety:
     * - Not thread-safe by default
     * - External synchronization required for concurrent access
     * 
     * Memory Management:
     * - Uses value semantics for tasks (copied, not referenced)
     * - Consider using shared_ptr for tasks if they become large or need sharing
     */
    class Project {
    public:
        /**
         * @brief Constructs a new project.
         * @param name Unique project name
         * @param description Project description
         * 
         * Creates a new project with NOT_STARTED status and 0% progress.
         */
        Project(const std::string& name, const std::string& description);

        /**
         * @brief Adds a new task to the project.
         * @param task The task to add
         * @throws std::runtime_error if task with same name already exists
         */
        void addTask(const Task& task);

        /**
         * @brief Updates the progress of a specific task.
         * @param taskName Name of the task to update
         * @param progress New progress value (0-100)
         * @throws std::runtime_error if task doesn't exist or progress is invalid
         * 
         * Automatically updates project status based on task progress.
         */
        void updateTaskProgress(const std::string& taskName, double progress);

        /**
         * @brief Removes a task from the project.
         * @param taskName Name of the task to remove
         * @throws std::runtime_error if task doesn't exist
         * 
         * Updates project status and progress after task removal.
         */
        void removeTask(const std::string& taskName);

        /**
         * @brief Sets the project's status manually.
         * @param status New project status
         * 
         * Note: Status may be automatically updated based on task progress.
         */
        void setProjectStatus(ProjectStatus status);

        // Getters
        std::string getName() const;          ///< Returns project name
        std::string getDescription() const;   ///< Returns project description
        ProjectStatus getStatus() const;      ///< Returns current project status
        
        /**
         * @brief Calculates and returns overall project progress.
         * @return Progress percentage (0-100)
         * 
         * Progress is calculated as average of all task progress values.
         */
        double getOverallProgress() const;
        
        /**
         * @brief Returns all tasks in the project.
         * @return Vector of tasks
         * 
         * Consider implementing pagination if projects grow large.
         */
        std::vector<Task> getTasks() const;

    private:
        /**
         * @brief Updates project status based on task progress.
         * 
         * Called automatically when:
         * - Task progress is updated
         * - Tasks are added/removed
         */
        void updateProjectStatus();

        std::string m_name;          ///< Unique project identifier
        std::string m_description;   ///< Project description
        ProjectStatus m_status;      ///< Current project status
        std::vector<Task> m_tasks;   ///< List of project tasks
    };
}
