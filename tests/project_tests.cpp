#include <gtest/gtest.h>
#include "../include/core/project.h"

TEST(ProjectTest, CreateProject) {
    DevTrack::Project project("Test Project", "A test project description");
    
    EXPECT_EQ(project.getName(), "Test Project");
    EXPECT_EQ(project.getDescription(), "A test project description");
    EXPECT_EQ(project.getStatus(), DevTrack::ProjectStatus::NOT_STARTED);
}

TEST(ProjectTest, AddTask) {
    DevTrack::Project project("Test Project", "A test project description");
    
    DevTrack::Task task{
        "Test Task", 
        "A test task description", 
        DevTrack::ProjectStatus::NOT_STARTED, 
        std::chrono::system_clock::now(), 
        0.0
    };
    
    project.addTask(task);
    
    EXPECT_EQ(project.getTasks().size(), 1);
    EXPECT_EQ(project.getTasks()[0].name, "Test Task");
}
