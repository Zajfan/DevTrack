using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DevTrack.DAL.Repositories
{
    public class ProjectDependencyRepository : BaseRepository
    {
        private readonly ProjectDependencyMapper projectDependencyMapper = new ProjectDependencyMapper();

        public ProjectDependencyRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<ProjectDependency>> GetAllProjectDependenciesAsync()
        {
            var dependencies = new List<ProjectDependency>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM project_dependencies";
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        dependencies.Add(projectDependencyMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all project dependencies: {ex.Message}");
                return new List<ProjectDependency>();
            }

            return dependencies;
        }

        public async Task CreateProjectDependencyAsync(ProjectDependency dependency)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO project_dependencies (ProjectID, DependsOnProjectID) " +
                                   "VALUES (@ProjectID, @DependsOnProjectID)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", dependency.ProjectID);
                    command.Parameters.AddWithValue("@DependsOnProjectID", dependency.DependsOnProjectID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating project dependency: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateProjectDependencyAsync(ProjectDependency dependency)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE project_dependencies SET ProjectID = @ProjectID, DependsOnProjectID = @DependsOnProjectID " +
                                   "WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", dependency.ProjectID);
                    command.Parameters.AddWithValue("@DependsOnProjectID", dependency.DependsOnProjectID);
                    command.Parameters.AddWithValue("@DependencyID", dependency.DependencyID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating project dependency: {ex.Message}");
                throw;
            }
        }

        public async Task DeleteProjectDependencyAsync(int dependencyId)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM project_dependencies WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@DependencyID", dependencyId);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting project dependency: {ex.Message}");
                throw;
            }
        }
    }
}