/**
 * @file project.cpp
 * @brief Implementation of the Project class and task management functionality.
 * 
 * This file contains the core project management logic including:
 * - Task addition and removal
 * - Progress tracking
 * - Status management
 * - Project metrics calculation
 * 
 * Implementation Notes:
 * - Uses STL algorithms for task operations
 * - Maintains consistency between task and project status
 * - Provides strong exception guarantees
 */

#include "../../include/core/project.h"
#include <algorithm>
#include <stdexcept>
#include <numeric>

namespace DevTrack {

/**
 * @brief Constructs a new Project with initial state.
 * 
 * Implementation Details:
 * - Sets initial status to NOT_STARTED
 * - Name and description are stored as provided
 * - No tasks are initially present
 */
Project::Project(const std::string& name, const std::string& description)
    : m_name(name), m_description(description), m_status(ProjectStatus::NOT_STARTED) {}

/**
 * @brief Adds a new task to the project.
 * 
 * Implementation Details:
 * - Uses std::find_if for duplicate detection
 * - Strong exception guarantee (no changes if throw)
 * - Updates project status after successful addition
 * 
 * Complexity: O(n) where n is number of tasks
 */
void Project::addTask(const Task& task) {
    // Check for duplicate task names
    auto it = std::find_if(m_tasks.begin(), m_tasks.end(), 
        [&task](const Task& existingTask) { 
            return existingTask.name == task.name; 
        });
    
    if (it != m_tasks.end()) {
        throw std::runtime_error("Task with this name already exists");
    }
    
    m_tasks.push_back(task);
    updateProjectStatus();
}

/**
 * @brief Updates a task's progress and status.
 * 
 * Implementation Details:
 * - Validates progress range (0-100)
 * - Updates task status based on progress
 * - Triggers project status update
 * 
 * Complexity: O(n) where n is number of tasks
 */
void Project::updateTaskProgress(const std::string& taskName, double progress) {
    auto it = std::find_if(m_tasks.begin(), m_tasks.end(), 
        [&taskName](const Task& task) { 
            return task.name == taskName; 
        });
    
    if (it == m_tasks.end()) {
        throw std::runtime_error("Task not found");
    }
    
    // Validate progress (between 0 and 100)
    it->progress = std::max(0.0, std::min(100.0, progress));
    it->status = (it->progress >= 100.0) ? ProjectStatus::COMPLETED : ProjectStatus::IN_PROGRESS;
    
    updateProjectStatus();
}

/**
 * @brief Updates the project's overall status based on task states.
 * 
 * Algorithm:
 * 1. Empty project -> NOT_STARTED
 * 2. All tasks complete -> COMPLETED
 * 3. Any task in progress -> IN_PROGRESS
 * 4. Mixed states -> most appropriate status based on progress
 * 
 * Complexity: O(n) where n is number of tasks
 */
void Project::updateProjectStatus() {
    // Calculate overall project progress
    if (m_tasks.empty()) {
        m_status = ProjectStatus::NOT_STARTED;
        return;
    }

    // Calculate average task progress
    double avgProgress = std::accumulate(
        m_tasks.begin(), m_tasks.end(), 0.0,
        [](double sum, const Task& task) { return sum + task.progress; }
    ) / m_tasks.size();

    // Determine project status based on task progress
    bool allTasksComplete = std::all_of(m_tasks.begin(), m_tasks.end(), 
        [](const Task& task) { 
            return task.progress >= 100.0; 
        });
    
    if (allTasksComplete) {
        m_status = ProjectStatus::COMPLETED;
    } else if (avgProgress > 0) {
        m_status = ProjectStatus::IN_PROGRESS;
    } else {
        m_status = ProjectStatus::NOT_STARTED;
    }
}

/**
 * @brief Manually sets the project status.
 * 
 * Note: This status may be automatically updated by other operations
 * that affect task progress or project state.
 */
void Project::setProjectStatus(ProjectStatus status) {
    m_status = status;
}

/**
 * @brief Removes a task from the project.
 * 
 * Implementation Details:
 * - Uses std::remove_if for efficient removal
 * - Updates project status after removal
 * - Strong exception guarantee
 * 
 * Complexity: O(n) where n is number of tasks
 */
void Project::removeTask(const std::string& taskName) {
    auto it = std::find_if(m_tasks.begin(), m_tasks.end(), 
        [&taskName](const Task& task) { 
            return task.name == taskName; 
        });
    
    if (it != m_tasks.end()) {
        m_tasks.erase(it);
        updateProjectStatus();
    }
}

// Getter implementations
/**
 * @brief Returns the project name.
 */
std::string Project::getName() const { return m_name; }

/**
 * @brief Returns the project description.
 */
std::string Project::getDescription() const { return m_description; }

/**
 * @brief Returns the current project status.
 */
ProjectStatus Project::getStatus() const { return m_status; }

/**
 * @brief Calculates the overall project progress.
 * 
 * Algorithm:
 * - Empty project: 0% progress
 * - With tasks: Average of all task progress values
 * 
 * Complexity: O(n) where n is number of tasks
 */
double Project::getOverallProgress() const {
    if (m_tasks.empty()) return 0.0;

    return std::accumulate(
        m_tasks.begin(), m_tasks.end(), 0.0,
        [](double sum, const Task& task) { return sum + task.progress; }
    ) / m_tasks.size();
}

/**
 * @brief Returns a copy of all tasks.
 * 
 * Note: Returns by value to prevent external modification
 * of internal task list.
 */
std::vector<Task> Project::getTasks() const {
    return m_tasks;
}

} // namespace DevTrack
