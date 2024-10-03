// IDbConnectionFactory.cs
namespace DevTrack.DAL.Repositories
{
    public interface IDbConnectionFactory
    {
        MySqlConnection CreateConnection();
    }
}