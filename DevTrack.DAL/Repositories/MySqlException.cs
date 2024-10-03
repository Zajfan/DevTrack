// MySqlException.cs

namespace DevTrack.DAL.Repositories
{
    [Serializable]
    internal class MySqlException : Exception
    {
        public MySqlException()
        {
        }

        public MySqlException(string? message) : base(message)
        {
        }

        public MySqlException(string? message, Exception? innerException) : base(message, innerException)
        {
        }
    }
}