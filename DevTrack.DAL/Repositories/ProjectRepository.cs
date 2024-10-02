using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DevTrack.Repositories
{
    public class ProjectRepository : BaseRepository
    {
        private readonly ProjectMapper projectMapper = new ProjectMapper();

        public ProjectRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Project>> GetAllProjectsAsync()
        {
            var projects = new List<Project>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM projects";
                    using var command = new MySqlCommand(query, connection);

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

        // ... (Add other async CRUD methods with parameterization and try-catch) ...
    }
}