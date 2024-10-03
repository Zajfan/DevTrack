using DevTrack.Models;
using DevTrack.Repositories;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DevTrack.BLL
{
    public class ProjectService
    {
        // Primary constructor for dependency injection
        public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository /*, ... other repositories */)
        {
            this.projectRepository = projectRepository;
            this.taskRepository = taskRepository;
            // ... initialize other repositories
        }

        public async Task<ProjectDashboardData> GetProjectDashboardDataAsync(int projectId)
        {
            var project = await projectRepository.GetProjectByIdAsync(projectId);
            var tasks = await taskRepository.GetTasksByProjectIdAsync(projectId);
            // ... get other relevant data (e.g., milestones, documents, etc.)

            return new ProjectDashboardData
            {
                Project = project,
                Tasks = tasks,
                // ... other data
            };
        }

        // ... (Other methods in ProjectService) ...
    }

    // ProjectDashboardData.cs (This should be in the same file or a separate file in the BLL project)
    public class ProjectDashboardData
    {
        public Project Project { get; set; }
        public List<Task> Tasks { get; set; }
        // ... other properties to hold relevant data
    }
}