// TaskRepository.cs
namespace DevTrack.DAL.Repositories
{
    public class TaskRepository : BaseRepository
    {
        private readonly TaskMapper taskMapper = new();

        public TaskRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Task>> GetAllTasksAsync()
        {
            List<Task> tasks = new();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM tasks";
                    using MySqlCommand command = new(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        tasks.Add(taskMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all tasks: {ex.Message}");
                return new List<Task>();
            }

            return tasks;
        }

        public async Task<List<Task>> GetTasksByProjectIdAsync(int projectId)
        {
            List<Task> tasks = new();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM tasks WHERE ProjectID = @ProjectID";
                    using MySqlCommand command = new(query, connection);
                    object value = command.Parameters.AddWithValue("@ProjectID", projectId);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        tasks.Add(taskMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting tasks by project ID: {ex.Message}");
                return new List<Task>();
            }

            return tasks;
        }

        // ... (Implement other CRUD methods: CreateTaskAsync, UpdateTaskAsync, DeleteTaskAsync) ...
    }
}