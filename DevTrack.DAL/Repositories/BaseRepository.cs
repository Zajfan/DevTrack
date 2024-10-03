// BaseRepository.cs
using DevTrack.DAL.Models;
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
        protected async Task ExecuteNonQueryAsync(string query,
            params (string name, object value)[] parameters)
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

        public MySqlConnection GetConnection()
        {
            return connectionFactory.CreateConnection();
        }

        public async Task<Project> GetProjectByIdAsync(int projectId, MySqlConnection connection, MySqlCommand command)
        {
            Project project = null;

            try
            {
                string query = "SELECT * FROM projects WHERE ProjectID = @ProjectID";
                MySqlCommand mySqlCommand = new(query, connection);
                object value = command.Parameters.AddWithValue("@ProjectID", projectId);

                await connection.OpenAsync();
                MySqlDataReader mySqlDataReader = await command.ExecuteReaderAsync();
                using var reader = mySqlDataReader;

                if (await reader.ReadAsync())
                {
                    project = projectMapper.MapFromReader(reader);
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting project by ID: {ex.Message}");
            }

            return project;
        }

        public static async Task<List<Project>> GetAllProjectsAsync(MySqlConnection connection, MySqlCommand command, MySqlDataReader reader, ProjectMapper projectMapper)
        {
            List<Project> projects = new();

            try
            {
                string query = "SELECT * FROM projects";
                MySqlCommand mySqlCommand = new(query, connection);
                await connection.OpenAsync();
                while (await reader.ReadAsync())
                {
                    projects.Add(item: projectMapper.MapFromReader(reader));
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all projects: {ex.Message}");
                return new List<Project>();
            }

            return projects;
        }
    }
}