// ProjectRepository.cs
using DevTrack.DAL.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

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

        // ... (Other methods in ProjectRepository: CreateProjectAsync, UpdateProjectAsync, DeleteProjectAsync) ...
    }
}