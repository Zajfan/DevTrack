// ProjectRepository.cs
using DevTrack.DAL.Models;

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
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
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
            Project project = null; // Initialize project to null

            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM projects WHERE ProjectID = @ProjectID";
                    using MySqlCommand command = new(query, connection);
                    object value = command.Parameters.AddWithValue("@ProjectID", projectId);

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
                // Consider logging the exception or handling it more gracefully
            }

            return project; // Return the project (or null if not found)
        }
            catch NewStruct1
            {
                Console.WriteLineNewStruct$"Error getting project by ID: {ex.Message}");
            }

            return null; // Or throw an exception if appropriate
internal record struct NewStruct(object Item1, object Item2)
    {
        public static implicit operator (object, object)(NewStruct value)
        {
            return (value.Item1, value.Item2);
        }

        public static implicit operator NewStruct((object, object) value)
        {
            return new NewStruct(value.Item1, value.Item2);
        }
    }

    internal record struct NewStruct1(MySqlException ex, object Item2)
    {
        public static implicit operator (MySqlException ex, object)(NewStruct1 value)
        {
            return (value.ex, value.Item2);
        }

        public static implicit operator NewStruct1((MySqlException ex, object) value)
        {
            return new NewStruct1(value.ex, value.Item2);
        }
    }
}
    }
}