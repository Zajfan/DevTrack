#pragma once

#include <vector>
#include <memory>
#include <string>

#include "project.h"
#include "../data/database.h"

namespace DevTrack {
    class ProjectManager {
    public:
        ProjectManager(Database& database);

        // Project Management
        void createProject(const std::string& name, const std::string& description);
        void deleteProject(const std::string& name);
        void updateProject(const Project& project);

        // Task Management
        void addTaskToProject(const std::string& projectName, const Task& task);
        void updateTaskProgress(const std::string& projectName, const std::string& taskName, double progress);

        // Query Methods
        std::vector<Project> getAllProjects() const;
        Project getProjectByName(const std::string& name) const;

    private:
        Database& m_database;
        std::vector<std::unique_ptr<Project>> m_projects;
    };
}
