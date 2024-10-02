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

// In ProjectRepository.cs (DAL)
public async Task<Project> GetProjectByIdAsync(int projectId)
{
    // ... (Implementation to retrieve a single project by ID) ...
}

// In TaskRepository.cs (DAL)
public async Task<List<Task>> GetTasksByProjectIdAsync(int projectId)
{
    // ... (Implementation to retrieve tasks for a specific project) ...
}

// In ProjectDashboardData.cs (You'll need to create this class)
public class ProjectDashboardData
{
    public Project Project { get; set; }
    public List<Task> Tasks { get; set; }
    // ... other properties to hold relevant data
}