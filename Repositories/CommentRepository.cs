using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Xml.Linq;

namespace DevTrack.Repositories
{
    public class CommentRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["DevTrackConnection"].ConnectionString;

        public List<Comment> GetAllComments()
        {
            var comments = new List<Comment>();

            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "SELECT * FROM comments";
                    using var command = new MySqlCommand(query, connection);

                    connection.Open();
                    using var reader = command.ExecuteReader();

                    while (reader.Read())
                    {
                        comments.Add(new Comment(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all comments: {ex.Message}");
                return new List<Comment>();
            }

            return comments;
        }

        public void CreateComment(Comment comment)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "INSERT INTO comments (ProjectID, TaskID, UserID, CommentText, CommentDate) " +
                                   "VALUES (@ProjectID, @TaskID, @UserID, @CommentText, @CommentDate)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", comment.ProjectID);
                    command.Parameters.AddWithValue("@TaskID", comment.TaskID);
                    command.Parameters.AddWithValue("@UserID", comment.UserID);
                    command.Parameters.AddWithValue("@CommentText", comment.CommentText);
                    command.Parameters.AddWithValue("@CommentDate", comment.CommentDate);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating comment: {ex.Message}");
                throw;
            }
        }

        public void UpdateComment(Comment comment)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "UPDATE comments SET ProjectID = @ProjectID, TaskID = @TaskID, UserID = @UserID, " +
                                   "CommentText = @CommentText, CommentDate = @CommentDate " +
                                   "WHERE CommentID = @CommentID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", comment.ProjectID);
                    command.Parameters.AddWithValue("@TaskID", comment.TaskID);
                    command.Parameters.AddWithValue("@UserID", comment.UserID);
                    command.Parameters.AddWithValue("@CommentText", comment.CommentText);
                    command.Parameters.AddWithValue("@CommentDate", comment.CommentDate);
                    command.Parameters.AddWithValue("@CommentID", comment.CommentID);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating comment: {ex.Message}");
                throw;
            }
        }

        public void DeleteComment(int commentId)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "DELETE FROM comments WHERE CommentID = @CommentID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@CommentID", commentId);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting comment: {ex.Message}");
                throw;
            }
        }
    }
}