using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Threading.Tasks; // Added for async/await

namespace DevTrack.Repositories
{
    public class ProjectRepository
    {
        private readonly IDbConnectionFactory connectionFactory; // Injected connection factory
        private readonly ProjectMapper projectMapper = new ProjectMapper(); // Data mapper

        public ProjectRepository(IDbConnectionFactory connectionFactory) // Constructor with DI
        {
            this.connectionFactory = connectionFactory;
        }

        public async Task<List<Project>> GetAllProjectsAsync() // Async method
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
                        projects.Add(projectMapper.MapFromReader(reader)); // Use the mapper
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

    // ProjectMapper class (for data mapping)
    public class ProjectMapper
    {
        public Project MapFromReader(MySqlDataReader reader)
        {
            return new Project
            {
                ProjectID = reader.GetInt32("ProjectID"),
                ProjectName = reader.GetString("ProjectName"),
                // ... map other properties
            };
        }
    }
}