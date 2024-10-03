using DevTrack.DAL.Models;

// BaseRepository.cs
namespace DevTrack.DAL.Repositories
{
    public abstract class BaseRepository
    {
        protected readonly IDbConnectionFactory connectionFactory;

        public BaseRepository(IDbConnectionFactory connectionFactory)
        {
            this.connectionFactory = connectionFactory;
        }

        public async Task CreateProjectAsync(Project project)
        {
            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO projects (ProjectName, ProjectStage, ProjectManager, StartDate, EstimatedCompletionDate, Budget, Description, Status, Priority, RepositoryURL, CategoryID) " +
                                   "VALUES (@ProjectName, @ProjectStage, @ProjectManager, @StartDate, @EstimatedCompletionDate, @Budget, @Description, @Status, @Priority, @RepositoryURL, @CategoryID)";
                    using MySqlCommand command = new MySqlCommand(query, connection);
                    object value = command.Parameters.AddWithValue("@ProjectName", project.ProjectName);
                    object value1 = command.Parameters.AddWithValue("@ProjectStage", project.ProjectStage);
                    object value2 = command.Parameters.AddWithValue("@ProjectManager", project.ProjectManager);
                    object value3 = command.Parameters.AddWithValue("@StartDate", project.StartDate);
                    object value4 = command.Parameters.AddWithValue("@EstimatedCompletionDate", project.EstimatedCompletionDate);
                    object value5 = command.Parameters.AddWithValue("@Budget", project.Budget);
                    object value6 = command.Parameters.AddWithValue("@Description", project.Description);
                    object value7 = command.Parameters.AddWithValue("@Status", project.Status);
                    object value8 = command.Parameters.AddWithValue("@Priority", project.Priority);
                    object value9 = command.Parameters.AddWithValue("@RepositoryURL", project.RepositoryURL);
                    object value10 = command.Parameters.AddWithValue("@CategoryID", project.CategoryID);

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

        public async Task DeleteProjectAsync(int projectId)
        {
            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM projects WHERE ProjectID = @ProjectID";
                    using MySqlCommand command = new MySqlCommand(query, connection);
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

        public async Task UpdateProjectAsync(Project project)
        {
            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE projects SET ProjectName = @ProjectName, ProjectStage = @ProjectStage, ProjectManager = @ProjectManager, " +
                                   "StartDate = @StartDate, EstimatedCompletionDate = @EstimatedCompletionDate, Budget = @Budget, Description = @Description, " +
                                   "Status = @Status, Priority = @Priority, RepositoryURL = @RepositoryURL, CategoryID = @CategoryID " +
                                   "WHERE ProjectID = @ProjectID";
                    using MySqlCommand command = new MySqlCommand(query, connection);
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

        // ... (Add common methods like ExecuteQuery, ExecuteNonQuery, etc.) ...
    }
}