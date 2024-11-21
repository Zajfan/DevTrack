#pragma once

#include <string>
#include <vector>
#include <chrono>

namespace DevTrack {
    enum class ProjectStatus {
        NOT_STARTED,
        IN_PROGRESS,
        PAUSED,
        COMPLETED
    };

    struct Task {
        std::string name;
        std::string description;
        ProjectStatus status;
        std::chrono::system_clock::time_point deadline;
        double progress;
    };

    class Project {
    public:
        Project(const std::string& name, const std::string& description);

        void addTask(const Task& task);
        void updateTaskProgress(const std::string& taskName, double progress);
        void removeTask(const std::string& taskName);
        void setProjectStatus(ProjectStatus status);

        std::string getName() const;
        std::string getDescription() const;
        ProjectStatus getStatus() const;
        double getOverallProgress() const;
        std::vector<Task> getTasks() const;

    private:
        void updateProjectStatus();

        std::string m_name;
        std::string m_description;
        ProjectStatus m_status;
        std::vector<Task> m_tasks;
    };
}
