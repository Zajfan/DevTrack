public async Task<ProjectDashboardData> GetProjectDashboardDataAsync(int projectId)
{
    var project = await projectRepository.GetProjectByIdAsync(projectId);
    var tasks = await taskRepository.GetTasksByProjectIdAsync(projectId);
    // ... get other relevant data

    return new ProjectDashboardData
    {
        Project = project,
        Tasks = tasks,
        // ... other data
    };
}