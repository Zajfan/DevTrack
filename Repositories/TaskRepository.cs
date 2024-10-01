using DevTrack.Models;
using MySql.Data.MySqlClient;
using System.Collections.Generic;
using System.Configuration;

namespace DevTrack.Repositories
{
    public class TaskRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["DevTrackConnection"].ConnectionString; // Made readonly

        public List<Task> GetAllTasks()
        {
            var tasks = new List<Task>(); // Use implicit type declaration

            using (var connection = new MySqlConnection(connectionString)) // Use implicit type declaration
            {
                string query = "SELECT * FROM tasks";
                using var command = new MySqlCommand(query, connection); // Use using declaration for command

                connection.Open();
                using var reader = command.ExecuteReader(); // Use using declaration for reader

                while (reader.Read())
                {
                    tasks.Add(new Task(reader));
                }
            }

            return tasks;
        }

        // ... (Add CreateTask, UpdateTask, and DeleteTask methods) ...
    }
}