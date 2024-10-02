using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DevTrack.DAL.Repositories
{
    public class TaskRepository : BaseRepository
    {
        private readonly TaskMapper taskMapper = new TaskMapper();

        public TaskRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Task>> GetAllTasksAsync()
        {
            var tasks = new List<Task>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM tasks";
                    using var command = new MySqlCommand(query, connection);

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

        public async Task CreateTaskAsync(Task task)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO tasks (ProjectID, TaskName, Description, AssignedTo, DueDate, Status, Priority, EstimatedTime, ActualTime) " +
                                   "VALUES (@ProjectID, @TaskName, @Description, @AssignedTo, @DueDate, @Status, @Priority, @EstimatedTime, @ActualTime)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", task.ProjectID);
                    command.Parameters.AddWithValue("@TaskName", task.TaskName);
                    command.Parameters.AddWithValue("@Description", task.Description);
                    command.Parameters.AddWithValue("@AssignedTo", task.AssignedTo);
                    command.Parameters.AddWithValue("@DueDate", task.DueDate);
                    command.Parameters.AddWithValue("@Status", task.Status);
                    command.Parameters.AddWithValue("@Priority", task.Priority);
                    command.Parameters.AddWithValue("@EstimatedTime", task.EstimatedTime);
                    command.Parameters.AddWithValue("@ActualTime", task.ActualTime);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating task: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateTaskAsync(Task task)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE tasks SET ProjectID = @ProjectID, TaskName = @TaskName, Description = @Description, AssignedTo = @AssignedTo, " +
                                   "DueDate = @DueDate, Status = @Status, Priority = @Priority, EstimatedTime = @EstimatedTime, ActualTime = @ActualTime " +
                                   "WHERE TaskID = @TaskID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", task.ProjectID);
                    command.Parameters.AddWithValue("@TaskName", task.TaskName);
                    command.Parameters.AddWithValue("@Description", task.Description);
                    command.Parameters.AddWithValue("@AssignedTo", task.AssignedTo);
                    command.Parameters.AddWithValue("@DueDate", task.DueDate);
                    command.Parameters.AddWithValue("@Status", task.Status);
                    command.Parameters.AddWithValue("@Priority", task.Priority);
                    command.Parameters.AddWithValue("@EstimatedTime", task.EstimatedTime);
                    command.Parameters.AddWithValue("@ActualTime", task.ActualTime);
                    command.Parameters.AddWithValue("@TaskID", task.TaskID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating task: {ex.Message}");
                throw;
            }
        }

        public async Task DeleteTaskAsync(int taskId)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM tasks WHERE TaskID = @TaskID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@TaskID", taskId);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting task: {ex.Message}");
                throw;
            }
        }
    }
}