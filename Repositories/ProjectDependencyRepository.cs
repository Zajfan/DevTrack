using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;

namespace DevTrack.Repositories
{
    public class ProjectDependencyRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["DevTrackConnection"].ConnectionString;

        public List<ProjectDependency> GetAllProjectDependencies()
        {
            var dependencies = new List<ProjectDependency>();

            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "SELECT * FROM project_dependencies";
                    using var command = new MySqlCommand(query, connection);

                    connection.Open();
                    using var reader = command.ExecuteReader();

                    while (reader.Read())
                    {
                        dependencies.Add(new ProjectDependency(reader));
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

        public void CreateProjectDependency(ProjectDependency dependency)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "INSERT INTO project_dependencies (ProjectID, DependsOnProjectID) " +
                                   "VALUES (@ProjectID, @DependsOnProjectID)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", dependency.ProjectID);
                    command.Parameters.AddWithValue("@DependsOnProjectID", dependency.DependsOnProjectID);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating project dependency: {ex.Message}");
                throw;
            }
        }

        public void UpdateProjectDependency(ProjectDependency dependency)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "UPDATE project_dependencies SET ProjectID = @ProjectID, DependsOnProjectID = @DependsOnProjectID " +
                                   "WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", dependency.ProjectID);
                    command.Parameters.AddWithValue("@DependsOnProjectID", dependency.DependsOnProjectID);
                    command.Parameters.AddWithValue("@DependencyID", dependency.DependencyID);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating project dependency: {ex.Message}");
                throw;
            }
        }

        public void DeleteProjectDependency(int dependencyId)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "DELETE FROM project_dependencies WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@DependencyID", dependencyId);

                    connection.Open();
                    command.ExecuteNonQuery();
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