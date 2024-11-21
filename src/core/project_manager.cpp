#include "../../include/core/project_manager.h"
#include <algorithm>
#include <stdexcept>
#include "spdlog/spdlog.h"

namespace DevTrack {

ProjectManager::ProjectManager(Database& database) 
    : m_database(database) {
    // Load existing projects from database
    auto projects = m_database.loadAllProjects();
    for (const auto& project : projects) {
        m_projects.push_back(std::make_unique<Project>(project));
    }
}

void ProjectManager::createProject(const std::string& name, const std::string& description) {
    try {
        // Check if project with same name already exists in the database
        auto projects = m_database.loadAllProjects();
        auto it = std::find_if(projects.begin(), projects.end(), 
            [&name](const Project& project) { 
                return project.getName() == name; 
            });
        
        if (it != projects.end()) {
            throw std::runtime_error("Project with this name already exists");
        }

        // Create and store new project
        auto newProject = std::make_unique<Project>(name, description);
        m_database.insertProject(*newProject);
        m_projects.push_back(std::move(newProject));
    } catch (const std::exception& e) {
        spdlog::error("Error creating project: {}", e.what());
        throw;
    }
}

void ProjectManager::deleteProject(const std::string& name) {
    try {
        auto it = std::find_if(m_projects.begin(), m_projects.end(), 
            [&name](const auto& project) { 
                return project->getName() == name; 
            });
        
        if (it == m_projects.end()) {
            throw std::runtime_error("Project not found");
        }

        // Remove from database and project list
        m_database.deleteProject(name);
        m_projects.erase(it);
    } catch (const std::exception& e) {
        spdlog::error("Error deleting project: {}", e.what());
        throw;
    }
}

void ProjectManager::updateProject(const Project& project) {
    try {
        auto it = std::find_if(m_projects.begin(), m_projects.end(), 
            [&project](const auto& existingProject) { 
                return existingProject->getName() == project.getName(); 
            });
        
        if (it == m_projects.end()) {
            throw std::runtime_error("Project not found");
        }

        // Update project in the database
        m_database.updateProject(project);
        *it = std::make_unique<Project>(project);
    } catch (const std::exception& e) {
        spdlog::error("Error updating project: {}", e.what());
        throw;
    }
}

void ProjectManager::addTaskToProject(const std::string& projectName, const Task& task) {
    try {
        auto it = std::find_if(m_projects.begin(), m_projects.end(), 
            [&projectName](const auto& project) { 
                return project->getName() == projectName; 
            });
        
        if (it == m_projects.end()) {
            throw std::runtime_error("Project not found");
        }

        // Add task to project
        (*it)->addTask(task);
        
        // Update project in database
        m_database.updateProject(**it);
    } catch (const std::exception& e) {
        spdlog::error("Error adding task to project: {}", e.what());
        throw;
    }
}

void ProjectManager::updateTaskProgress(const std::string& projectName, const std::string& taskName, double progress) {
    try {
        auto it = std::find_if(m_projects.begin(), m_projects.end(), 
            [&projectName](const auto& project) { 
                return project->getName() == projectName; 
            });
        
        if (it == m_projects.end()) {
            throw std::runtime_error("Project not found");
        }

        // Update task progress
        (*it)->updateTaskProgress(taskName, progress);
        
        // Update project in database
        m_database.updateProject(**it);
    } catch (const std::exception& e) {
        spdlog::error("Error updating task progress: {}", e.what());
        throw;
    }
}

std::vector<Project> ProjectManager::getAllProjects() const {
    std::vector<Project> projects;
    for (const auto& project : m_projects) {
        projects.push_back(*project);
    }
    return projects;
}

Project ProjectManager::getProjectByName(const std::string& name) const {
    try {
        auto it = std::find_if(m_projects.begin(), m_projects.end(), 
            [&name](const auto& project) { 
                return project->getName() == name; 
            });
        
        if (it == m_projects.end()) {
            throw std::runtime_error("Project not found");
        }

        return **it;
    } catch (const std::exception& e) {
        spdlog::error("Error getting project by name: {}", e.what());
        throw;
    }
}

} // namespace DevTrack
