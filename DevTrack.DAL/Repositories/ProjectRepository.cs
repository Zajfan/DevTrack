// ProjectRepository.cs
using static MySql.Data.MySqlClient;

namespace DevTrack.DAL.Repositories
{
    public class ProjectRepository : BaseRepository
    {
        private readonly ProjectMapper projectMapper = new();

        public ProjectRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Project>> GetAllProjectsAsync()
        {
            List<Project> projects = new();

            try
            {
                using (MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM projects";
                    using MySqlCommand command = new(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        projects.Add(projectMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all projects: {ex.Message}");
                return new List<Project>();
            }

            return projects;
        }

        public async Task<Project> GetProjectByIdAsync(int projectId)
        {
            Project project = null;

            try
            {
                using (MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM projects WHERE ProjectID = @ProjectID";
                    using MySqlCommand command = new(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", projectId);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    if (await reader.ReadAsync())
                    {
                        project = projectMapper.MapFromReader(reader);
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting project by ID: {ex.Message}");
            }

            return project;
        }

        public async Task CreateProjectAsync(Project project)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO projects (ProjectName, ProjectStage, ProjectManager, StartDate, EstimatedCompletionDate, Budget, Description, Status, Priority, RepositoryURL, CategoryID) " +
                                   "VALUES (@ProjectName, @ProjectStage, @ProjectManager, @StartDate, @EstimatedCompletionDate, @Budget, @Description, @Status, @Priority, @RepositoryURL, @CategoryID)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectName", project.ProjectName);
                    command.Parameters.AddWithValue("@ProjectStage", project.ProjectStage);
                    command.Parameters.AddWithValue("@ProjectManager", project.ProjectManager);
                    command.Parameters.AddWithValue("@StartDate", project.StartDate);
                    command.Parameters.AddWithValue("@EstimatedCompletionDate", project.EstimatedCompletionDate);
                    command.Parameters.AddWithValue("@Budget", project.Budget);
                    command.Parameters.AddWithValue("@Description", project.Description);
                    command.Parameters.AddWithValue("@Status", project.Status);
                    command.Parameters.AddWithValue("@Priority", project.Priority);
                    command.Parameters.AddWithValue("@RepositoryURL", project.RepositoryURL);
                    command.Parameters.AddWithValue("@CategoryID", project.CategoryID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating project: {ex.Message}");
                throw; // Re-throw the exception after logging, or handle it appropriately
            }
        }

        public async Task UpdateProjectAsync(Project project)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE projects SET ProjectName = @ProjectName, ProjectStage = @ProjectStage, ProjectManager = @ProjectManager, " +
                                   "StartDate = @StartDate, EstimatedCompletionDate = @EstimatedCompletionDate, Budget = @Budget, Description = @Description, " +
                                   "Status = @Status, Priority = @Priority, RepositoryURL = @RepositoryURL, CategoryID = @CategoryID " +
                                   "WHERE ProjectID = @ProjectID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectName", project.ProjectName);
                    command.Parameters.AddWithValue("@ProjectStage", project.ProjectStage);
                    command.Parameters.AddWithValue("@ProjectManager", project.ProjectManager);
                    command.Parameters.AddWithValue("@StartDate", project.StartDate);
                    command.Parameters.AddWithValue("@EstimatedCompletionDate", project.EstimatedCompletionDate);
                    command.Parameters.AddWithValue("@Budget", project.Budget);
                    command.Parameters.AddWithValue("@Description", project.Description);
                    command.Parameters.AddWithValue("@Status", project.Status);
                    command.Parameters.AddWithValue("@Priority", project.Priority);
                    command.Parameters.AddWithValue("@RepositoryURL", project.RepositoryURL);
                    command.Parameters.AddWithValue("@CategoryID", project.CategoryID);
                    command.Parameters.AddWithValue("@ProjectID", project.ProjectID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating project: {ex.Message}");
                throw; // Re-throw the exception after logging, or handle it appropriately
            }
        }

        public async Task DeleteProjectAsync(int projectId)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM projects WHERE ProjectID = @ProjectID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", projectId);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting project: {ex.Message}");
                throw; // Re-throw the exception after logging, or handle it appropriately
            }
        }
    }
}