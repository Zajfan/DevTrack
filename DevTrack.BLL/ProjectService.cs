// ProjectService.cs
namespace DevTrack.BLL
{
    public class ProjectService
    {
        private readonly ProjectRepository projectRepository;
        private readonly TaskRepository taskRepository;

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

}