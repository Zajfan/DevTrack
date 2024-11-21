#include "../../include/core/project.h"
#include <algorithm>
#include <stdexcept>
#include <numeric>

namespace DevTrack {

Project::Project(const std::string& name, const std::string& description)
    : m_name(name), m_description(description), m_status(ProjectStatus::NOT_STARTED) {}

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

void Project::setProjectStatus(ProjectStatus status) {
    m_status = status;
}

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

std::string Project::getName() const {
    return m_name;
}

std::string Project::getDescription() const {
    return m_description;
}

ProjectStatus Project::getStatus() const {
    return m_status;
}

double Project::getOverallProgress() const {
    if (m_tasks.empty()) return 0.0;

    return std::accumulate(
        m_tasks.begin(), m_tasks.end(), 0.0,
        [](double sum, const Task& task) { return sum + task.progress; }
    ) / m_tasks.size();
}

std::vector<Task> Project::getTasks() const {
    return m_tasks;
}

} // namespace DevTrack
