using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DevTrack.DAL.Repositories
{
    public abstract class BaseRepository
    {
        protected readonly IDbConnectionFactory connectionFactory;

        public BaseRepository(IDbConnectionFactory connectionFactory)
        {
            this.connectionFactory = connectionFactory;
        }

        // Example of a common method for executing queries that don't return data
        protected async Task ExecuteNonQueryAsync(string query, params (string name, object value)[] parameters)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    using var command = new MySqlCommand(query, connection);

                    foreach (var (name, value) in parameters)
                    {
                        command.Parameters.AddWithValue(name, value);
                    }

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error executing query: {ex.Message}");
                throw; // Re-throw the exception after logging, or handle it appropriately
            }
        }

        // Example Create, Update, and Delete methods for Project (replace with your actual logic)
        public async Task CreateProjectAsync(Project project)
        {
            string query = "INSERT INTO projects (ProjectName, ProjectStage, ProjectManager, StartDate, EstimatedCompletionDate, Budget, Description, Status, Priority, RepositoryURL, CategoryID) " +
                           "VALUES (@ProjectName, @ProjectStage, @ProjectManager, @StartDate, @EstimatedCompletionDate, @Budget, @Description, @Status, @Priority, @RepositoryURL, @CategoryID)";

            await ExecuteNonQueryAsync(query,
                ("@ProjectName", project.ProjectName),
                ("@ProjectStage", project.ProjectStage),
                ("@ProjectManager", project.ProjectManager),
                ("@StartDate", project.StartDate),
                ("@EstimatedCompletionDate", project.EstimatedCompletionDate),
                ("@Budget", project.Budget),
                ("@Description", project.Description),
                ("@Status", project.Status),
                ("@Priority", project.Priority),
                ("@RepositoryURL", project.RepositoryURL),
                ("@CategoryID", project.CategoryID));
        }

        public async Task UpdateProjectAsync(Project project)
        {
            string query = "UPDATE projects SET ProjectName = @ProjectName, ProjectStage = @ProjectStage, ProjectManager = @ProjectManager, " +
                           "StartDate = @StartDate, EstimatedCompletionDate = @EstimatedCompletionDate, Budget = @Budget, Description = @Description, " +
                           "Status = @Status, Priority = @Priority, RepositoryURL = @RepositoryURL, CategoryID = @CategoryID " +
                           "WHERE ProjectID = @ProjectID";

            await ExecuteNonQueryAsync(query,
                ("@ProjectName", project.ProjectName),
                ("@ProjectStage", project.ProjectStage),
                ("@ProjectManager", project.ProjectManager),
                ("@StartDate", project.StartDate),
                ("@EstimatedCompletionDate", project.EstimatedCompletionDate),
                ("@Budget", project.Budget),
                ("@Description", project.Description),
                ("@Status", project.Status),
                ("@Priority", project.Priority),
                ("@RepositoryURL", project.RepositoryURL),
                ("@CategoryID", project.CategoryID),
                ("@ProjectID", project.ProjectID));
        }

        public async Task DeleteProjectAsync(int projectId)
        {
            string query = "DELETE FROM projects WHERE ProjectID = @ProjectID";

            await ExecuteNonQueryAsync(query, ("@ProjectID", projectId));
        }
    }
}