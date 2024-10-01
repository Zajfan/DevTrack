using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;

namespace DevTrack.Repositories
{
    public class TaskDependencyRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["DevTrackConnection"].ConnectionString;

        public List<TaskDependency> GetAllTaskDependencies()
        {
            var dependencies = new List<TaskDependency>();

            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "SELECT * FROM task_dependencies";
                    using var command = new MySqlCommand(query, connection);

                    connection.Open();
                    using var reader = command.ExecuteReader();

                    while (reader.Read())
                    {
                        dependencies.Add(new TaskDependency(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all task dependencies: {ex.Message}");
                return new List<TaskDependency>();
            }

            return dependencies;
        }

        public void CreateTaskDependency(TaskDependency dependency)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "INSERT INTO task_dependencies (TaskID, DependsOnTaskID) " +
                                   "VALUES (@TaskID, @DependsOnTaskID)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@TaskID", dependency.TaskID);
                    command.Parameters.AddWithValue("@DependsOnTaskID", dependency.DependsOnTaskID);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating task dependency: {ex.Message}");
                throw;
            }
        }

        public void UpdateTaskDependency(TaskDependency dependency)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "UPDATE task_dependencies SET TaskID = @TaskID, DependsOnTaskID = @DependsOnTaskID " +
                                   "WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@TaskID", dependency.TaskID);
                    command.Parameters.AddWithValue("@DependsOnTaskID", dependency.DependsOnTaskID);
                    command.Parameters.AddWithValue("@DependencyID", dependency.DependencyID);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating task dependency: {ex.Message}");
                throw;
            }
        }

        public void DeleteTaskDependency(int dependencyId)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "DELETE FROM task_dependencies WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@DependencyID", dependencyId);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting task dependency: {ex.Message}");
                throw;
            }
        }
    }
}