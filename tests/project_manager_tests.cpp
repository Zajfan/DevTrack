#include <gtest/gtest.h>
#include "../include/core/project_manager.h"
#include "../include/data/database.h"

class ProjectManagerTest : public ::testing::Test {
protected:
    DevTrack::Database m_database{"test_projects.db"};
    DevTrack::ProjectManager m_projectManager{m_database};
};

TEST_F(ProjectManagerTest, CreateProject) {
    m_projectManager.createProject("Test Project", "A test project description");
    
    auto projects = m_projectManager.getAllProjects();
    EXPECT_EQ(projects.size(), 1);
    EXPECT_EQ(projects[0].getName(), "Test Project");
}

TEST_F(ProjectManagerTest, DeleteProject) {
    m_projectManager.createProject("Test Project", "A test project description");
    m_projectManager.deleteProject("Test Project");
    
    auto projects = m_projectManager.getAllProjects();
    EXPECT_EQ(projects.size(), 0);
}
